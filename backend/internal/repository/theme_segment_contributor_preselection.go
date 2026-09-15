package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/permissions"

	"github.com/jackc/pgx/v5"
)

// ensureThemeSegmentContributorsPreselectedTx fires GAP-07's preselection (Phase 156, Plan
// 156-18, 156-UAT.md GAP-07 -- "Segment-Mitwirkende automatisch vorauswaehlen (gespeichert,
// abwaehlbar)", Auftraggeber-bestaetigt 2026-09-14), repointed by GAP-09 (Plan 156-21,
// Auftraggeber-Entscheidung im Chat, 2026-09-15). The marker check runs FIRST, before any
// other work: originReleaseVersionID == nil, or the segment's contributors_initialized_at
// already NOT NULL, both short-circuit to (0, nil) with zero DB writes -- "kein Auto-Refill"
// (decision 5) holds independent of any call-site wiring. Otherwise every effective contributor
// of originReleaseVersionID (loadPublicEffectiveContributors) holding at least one
// GAP-09-preselection-eligible role (see below) is inserted into theme_segment_contributors (ON
// CONFLICT DO NOTHING, mirroring theme_segment_contributors.go's own insert shape), and
// contributors_initialized_at is unconditionally set to NOW() -- even when zero contributors
// qualified, an origin with no segment-relevant crew still counts as "initialized", never
// retried. Returns the number of rows actually inserted.
//
// GAP-09 deliberately reads this SMALLER preselection-only list here, not the full
// SegmentCreditRoleCodes credit/label list -- encoder and designer are now segment-relevant for
// public credit purposes (Plan 156-20), but 156-UAT.md GAP-09 point 2 requires "Vorauswahl
// unveraendert": they must never be auto-preselected, only ever added manually by an admin.
// Because this is a SEPARATE package var rather than the same list minus an ad-hoc filter, a
// future extension of the full credit-role list (e.g. a ninth segment-relevant role) does NOT
// silently become auto-preselected -- it requires a deliberate second edit to this preselection
// list.
func ensureThemeSegmentContributorsPreselectedTx(ctx context.Context, tx pgx.Tx, segmentID int64, originReleaseVersionID *int64) (int, error) {
	if originReleaseVersionID == nil {
		// Segment ohne Origin -> keine Vorauswahl, Merker bleibt NULL.
		return 0, nil
	}

	var alreadyInitialized bool
	if err := tx.QueryRow(ctx, `
		SELECT contributors_initialized_at IS NOT NULL FROM theme_segments WHERE id = $1
	`, segmentID).Scan(&alreadyInitialized); err != nil {
		return 0, fmt.Errorf("ensure theme segment contributors preselected segment=%d: load marker: %w", segmentID, err)
	}
	if alreadyInitialized {
		return 0, nil
	}

	effective, err := loadPublicEffectiveContributors(ctx, tx, []int64{*originReleaseVersionID})
	if err != nil {
		return 0, fmt.Errorf("ensure theme segment contributors preselected segment=%d: load effective contributors: %w", segmentID, err)
	}

	relevant := make(map[string]struct{}, len(permissions.SegmentCreditPreselectionRoleCodes))
	for _, code := range permissions.SegmentCreditPreselectionRoleCodes {
		relevant[code] = struct{}{}
	}

	inserted := 0
	for _, contributor := range effective[*originReleaseVersionID] {
		qualifies := false
		for _, roleCode := range contributor.RoleCodes {
			if _, ok := relevant[roleCode]; ok {
				qualifies = true
				break
			}
		}
		if !qualifies {
			continue
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO theme_segment_contributors (theme_segment_id, member_id)
			VALUES ($1, $2)
			ON CONFLICT (theme_segment_id, member_id) DO NOTHING
		`, segmentID, contributor.MemberID)
		if err != nil {
			return 0, fmt.Errorf("ensure theme segment contributors preselected segment=%d member=%d: %w", segmentID, contributor.MemberID, err)
		}
		inserted += int(tag.RowsAffected())
	}

	if _, err := tx.Exec(ctx, `
		UPDATE theme_segments SET contributors_initialized_at = NOW() WHERE id = $1
	`, segmentID); err != nil {
		return 0, fmt.Errorf("ensure theme segment contributors preselected segment=%d: set initialized marker: %w", segmentID, err)
	}

	return inserted, nil
}

// ensureThemeSegmentOriginAndContributorsTx composes ensureThemeSegmentOriginTx (Plan 156-16,
// deliberately left UNMODIFIED by this plan -- its own "never auto-insert a contributor"
// contract and dedicated theme_segment_origin_sync_integration_test.go stay literally true,
// which is why GAP-07's new insertion behavior lives entirely in this separate file instead of
// being added to theme_segment_origin_sync.go) with GAP-07's preselection. Every one of the FIVE
// existing ensureThemeSegmentOriginTx call sites (range sync, CreateAnimeSegment's implicit
// branch, release-version auto-assignment, and the manual per-release assign/unassign endpoints)
// must call THIS function instead. Deliberately does NOT gate the preselection call on
// outcome.Changed -- 156-UAT.md GAP-07 says preselection fires "immer genau dann, wenn ein
// Segment eine gueltige Origin hat UND der Merker NULL ist", independent of whether THIS call is
// what made the origin valid.
func ensureThemeSegmentOriginAndContributorsTx(ctx context.Context, tx pgx.Tx, segmentID int64) (*ThemeSegmentOriginSyncOutcome, int, error) {
	outcome, err := ensureThemeSegmentOriginTx(ctx, tx, segmentID)
	if err != nil {
		return nil, 0, err
	}

	preselectedCount, err := ensureThemeSegmentContributorsPreselectedTx(ctx, tx, segmentID, outcome.After)
	if err != nil {
		return nil, 0, err
	}

	return outcome, preselectedCount, nil
}
