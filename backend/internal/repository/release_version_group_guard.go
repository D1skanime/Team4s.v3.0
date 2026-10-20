package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// DependencySummary reports how many real, counted dependents a single
// (release_version_id, fansub_group_id) pair has (Phase 187). Deliberately
// never includes release_crew_snapshots (D-09): that table holds no actual
// crew content of its own -- only release_version_id/fansub_group_id/
// snapshot_mode -- real credit content lives exclusively in
// release_role_credit_lifecycles.
type DependencySummary struct {
	Credits int32
	Media   int32
	Notes   int32
}

// HasAny reports whether this pair has at least one real dependent of any
// counted kind.
func (s DependencySummary) HasAny() bool {
	return s.Credits > 0 || s.Media > 0 || s.Notes > 0
}

// germanPluralCount formats a single count with its correctly pluralized
// German noun. Exactly 1 uses the singular form; every other count
// (including 0) uses the plural form -- mirrors the frontend's
// formatGermanCount (episodeVersionEditorUtils.ts).
func germanPluralCount(count int32, singular string, plural string) string {
	if count == 1 {
		return fmt.Sprintf("%d %s", count, singular)
	}
	return fmt.Sprintf("%d %s", count, plural)
}

// GermanReasonFragment returns the correctly pluralized German fragment
// naming every counted dependent kind (e.g. "1 Credit, 0 Medien, 2
// Notizen"), shared by both the editor-path 409 message
// (episode_version_update.go) and the import-apply conflict message
// (episode_import_repository_apply.go) so the two call sites cannot drift
// out of sync with each other or with the frontend's chip tooltip.
func (s DependencySummary) GermanReasonFragment() string {
	return fmt.Sprintf(
		"%s, %s, %s",
		germanPluralCount(s.Credits, "Credit", "Credits"),
		germanPluralCount(s.Media, "Medium", "Medien"),
		germanPluralCount(s.Notes, "Notiz", "Notizen"),
	)
}

// dependentsQueryRower is the minimal surface countReleaseVersionGroupDependents
// needs. Both *pgxpool.Pool and pgx.Tx satisfy it, so the same counting
// function serves a pre-write transactional check (A2: pre-check, no
// savepoints) and a plain, non-transactional read (GetReleaseVersionGroupDependents).
type dependentsQueryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// countReleaseVersionGroupDependents counts the real dependents of a single
// (release_version_id, fansub_group_id) pair: awarded/pending/reversed
// release_role_credit_lifecycles rows (D-07), non-deleted release_version_media
// rows (D-08), and non-deleted release_version_notes rows (D-08). This is the
// EXACT SAME call regardless of whether the fansub group is the release's only
// group or one of several partner groups -- no parameter distinguishes "sole"
// vs "partner" (D-07's "no exception for partner groups").
func countReleaseVersionGroupDependents(
	ctx context.Context,
	db dependentsQueryRower,
	releaseVersionID int64,
	fansubGroupID int64,
) (DependencySummary, error) {
	var summary DependencySummary
	err := db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM release_role_credit_lifecycles
				WHERE release_version_id = $1 AND fansub_group_id = $2) AS credits,
			(SELECT COUNT(*) FROM release_version_media
				WHERE release_version_id = $1 AND fansub_group_id = $2 AND deleted_at IS NULL) AS media,
			(SELECT COUNT(*) FROM release_version_notes
				WHERE release_version_id = $1 AND fansub_group_id = $2 AND deleted_at IS NULL) AS notes
	`, releaseVersionID, fansubGroupID).Scan(&summary.Credits, &summary.Media, &summary.Notes)
	if err != nil {
		return DependencySummary{}, fmt.Errorf("count release version group dependents: %w", err)
	}
	return summary, nil
}

// FansubGroupDependencySummary reports how many real dependents a whole
// fansub group has, keyed by fansub_group_id alone (Phase 189, D-12) --
// structurally different from DependencySummary above, which is keyed by a
// (release_version_id, fansub_group_id) PAIR. FK-verified against every
// `REFERENCES fansub_groups(id)` site in database/migrations (189-RESEARCH.md);
// deliberately excludes fansub_group_aliases, the empty legacy fansub_members
// table, and the pure-assignment anime_fansub_groups link (no real release),
// per CONTEXT.md D-12 and RESEARCH.md's corrected dependents table.
//
// RESEARCH.md's dependents table also listed fansub_collaboration_members
// (introduced by migration 0015) as a candidate "yes" category -- confirmed
// during live verification of this plan that migration
// 0102_drop_collaboration_schema.up.sql (Phase 81, D-02) already DROPPED
// that table and fansub_groups.group_type entirely; the collaboration
// feature no longer exists in the current schema at all. Deliberately NOT
// counted here -- counting a table that does not exist would make every
// DeleteGroup call fail with a raw "relation does not exist" error, exactly
// the class of bug this plan exists to fix, not reintroduce.
type FansubGroupDependencySummary struct {
	Releases                int32
	Memberships             int32
	Contributions           int32
	HistoricalMembers       int32
	Media                   int32
	GroupNotes              int32
	ProjectNotes            int32
	History                 int32
	Segments                int32
	SegmentLibrary          int32
	DefaultCrew             int32
	PendingInvitations      int32
	PendingClaimInvitations int32
	CapabilityOverrides     int32
	PlaybackEntitlements    int32
	ReviewDecisions         int32
	ReviewAuditHistory      int32
	OverrideHistory         int32
}

// HasAny reports whether this fansub group has at least one real dependent
// of any counted kind.
func (s FansubGroupDependencySummary) HasAny() bool {
	return s.Releases > 0 ||
		s.Memberships > 0 ||
		s.Contributions > 0 ||
		s.HistoricalMembers > 0 ||
		s.Media > 0 ||
		s.GroupNotes > 0 ||
		s.ProjectNotes > 0 ||
		s.History > 0 ||
		s.Segments > 0 ||
		s.SegmentLibrary > 0 ||
		s.DefaultCrew > 0 ||
		s.PendingInvitations > 0 ||
		s.PendingClaimInvitations > 0 ||
		s.CapabilityOverrides > 0 ||
		s.PlaybackEntitlements > 0 ||
		s.ReviewDecisions > 0 ||
		s.ReviewAuditHistory > 0 ||
		s.OverrideHistory > 0
}

// GermanReasonFragment returns a correctly pluralized German fragment naming
// every NON-ZERO counted dependent kind, joined with ", ". Deliberately
// DIFFERENT from DependencySummary.GermanReasonFragment above, which always
// lists all 3 of its categories (including zeros): here there are 18
// categories, so an always-list-everything message would be an unreadable
// wall of "0 X, 0 Y, ..." noise. Listing only what is actually non-zero
// keeps the 409 message scannable for the admin while still naming every
// real blocker.
func (s FansubGroupDependencySummary) GermanReasonFragment() string {
	type counted struct {
		count    int32
		singular string
		plural   string
	}
	candidates := []counted{
		{s.Releases, "Release", "Releases"},
		{s.Memberships, "Mitgliedschaft", "Mitgliedschaften"},
		{s.Contributions, "Beitrag", "Beiträge"},
		{s.HistoricalMembers, "historisches Mitglied", "historische Mitglieder"},
		{s.Media, "Medium", "Medien"},
		{s.GroupNotes, "Gruppennotiz", "Gruppennotizen"},
		{s.ProjectNotes, "Projektnotiz", "Projektnotizen"},
		{s.History, "Chronik-Eintrag", "Chronik-Einträge"},
		{s.Segments, "Segment", "Segmente"},
		{s.SegmentLibrary, "Segment-Bibliothekseintrag", "Segment-Bibliothekseinträge"},
		{s.DefaultCrew, "Standard-Besetzungs-Eintrag", "Standard-Besetzungs-Einträge"},
		{s.PendingInvitations, "offene Einladung", "offene Einladungen"},
		{s.PendingClaimInvitations, "offene Claim-Einladung", "offene Claim-Einladungen"},
		{s.CapabilityOverrides, "Rechte-Override", "Rechte-Overrides"},
		{s.PlaybackEntitlements, "Freischaltregel", "Freischaltregeln"},
		{s.ReviewDecisions, "Review-Entscheidung", "Review-Entscheidungen"},
		{s.ReviewAuditHistory, "Review-Protokolleintrag", "Review-Protokolleinträge"},
		{s.OverrideHistory, "Override-Historieneintrag", "Override-Historieneinträge"},
	}

	fragments := make([]string, 0, len(candidates))
	for _, c := range candidates {
		if c.count <= 0 {
			continue
		}
		fragments = append(fragments, germanPluralCount(c.count, c.singular, c.plural))
	}

	return strings.Join(fragments, ", ")
}

// countFansubGroupDependents counts every real dependent of a single
// fansub group (Phase 189, D-12) in one QueryRow with one scalar subquery
// per table -- the exact same shape as countReleaseVersionGroupDependents
// above, just keyed by fansub_group_id alone instead of a
// (release_version_id, fansub_group_id) pair. fansub_group_media's FK
// column is named `group_id`, not `fansub_group_id` -- confirmed against
// database/migrations/0026_add_media_tables.up.sql, not assumed.
func countFansubGroupDependents(
	ctx context.Context,
	db dependentsQueryRower,
	fansubGroupID int64,
) (FansubGroupDependencySummary, error) {
	var summary FansubGroupDependencySummary
	err := db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM release_version_groups
				WHERE fansub_group_id = $1) AS releases,
			(SELECT COUNT(*) FROM fansub_group_members
				WHERE fansub_group_id = $1) AS memberships,
			(SELECT COUNT(*) FROM anime_contributions
				WHERE fansub_group_id = $1) AS contributions,
			(SELECT COUNT(*) FROM hist_fansub_group_members
				WHERE fansub_group_id = $1) AS historical_members,
			(SELECT COUNT(*) FROM fansub_group_media
				WHERE group_id = $1) AS media,
			(SELECT COUNT(*) FROM fansub_group_notes
				WHERE fansub_group_id = $1 AND deleted_at IS NULL) AS group_notes,
			(SELECT COUNT(*) FROM anime_fansub_project_notes
				WHERE fansub_group_id = $1 AND deleted_at IS NULL) AS project_notes,
			(SELECT COUNT(*) FROM fansub_group_history
				WHERE fansub_group_id = $1) AS history,
			(SELECT COUNT(*) FROM theme_segments
				WHERE fansub_group_id = $1) AS segments,
			(SELECT COUNT(*) FROM segment_library_definitions
				WHERE fansub_group_id = $1) AS segment_library,
			(SELECT COUNT(*) FROM fansub_group_default_crew
				WHERE fansub_group_id = $1) AS default_crew,
			(SELECT COUNT(*) FROM fansub_group_invitations
				WHERE fansub_group_id = $1 AND status = 'pending') AS pending_invitations,
			(SELECT COUNT(*) FROM member_claim_invitations
				WHERE fansub_group_id = $1 AND status = 'pending') AS pending_claim_invitations,
			(SELECT COUNT(*) FROM user_group_capability_overrides
				WHERE fansub_group_id = $1) AS capability_overrides,
			(SELECT COUNT(*) FROM release_playback_entitlement_rules
				WHERE fansub_group_id = $1) AS playback_entitlements,
			(SELECT COUNT(*) FROM review_decisions
				WHERE fansub_group_id = $1) AS review_decisions,
			(SELECT COUNT(*) FROM review_audit_events
				WHERE fansub_group_id = $1) AS review_audit_history,
			(SELECT COUNT(*) FROM user_group_capability_override_history
				WHERE fansub_group_id = $1) AS override_history
	`, fansubGroupID).Scan(
		&summary.Releases,
		&summary.Memberships,
		&summary.Contributions,
		&summary.HistoricalMembers,
		&summary.Media,
		&summary.GroupNotes,
		&summary.ProjectNotes,
		&summary.History,
		&summary.Segments,
		&summary.SegmentLibrary,
		&summary.DefaultCrew,
		&summary.PendingInvitations,
		&summary.PendingClaimInvitations,
		&summary.CapabilityOverrides,
		&summary.PlaybackEntitlements,
		&summary.ReviewDecisions,
		&summary.ReviewAuditHistory,
		&summary.OverrideHistory,
	)
	if err != nil {
		return FansubGroupDependencySummary{}, fmt.Errorf("count fansub group dependents: %w", err)
	}
	return summary, nil
}

// GetReleaseVersionGroupDependents is the sole exported entry point Plan 04's
// handler code uses to inspect a single pair's dependents before offering a
// group change in the UI. Kept as a thin wrapper here (not added to
// episode_version_repository.go itself) so that already-oversized file is not
// touched -- and therefore does not need the 450-line split -- in this phase.
func (r *EpisodeVersionRepository) GetReleaseVersionGroupDependents(
	ctx context.Context,
	releaseVersionID int64,
	fansubGroupID int64,
) (DependencySummary, error) {
	return countReleaseVersionGroupDependents(ctx, r.db, releaseVersionID, fansubGroupID)
}

// queryCurrentReleaseVersionGroupIDs reads the current fansub_group_id set for
// a release version, inside the caller's transaction (A2: pre-check runs
// before any DELETE/INSERT for the same mapping/patch).
func queryCurrentReleaseVersionGroupIDs(ctx context.Context, tx pgx.Tx, releaseVersionID int64) ([]int64, error) {
	rows, err := tx.Query(ctx, `
		SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("query current release version groups: %w", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan current release version group id: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate current release version group ids: %w", err)
	}
	return ids, nil
}

// diffRemovedReleaseVersionGroupIDs is a pure set-difference helper: current
// minus new. A same-group update or an add-only change always yields an empty
// result (the guard below becomes a no-op); only an actual replace/removal
// produces a non-empty result. This single definition is why D-07 ("removing
// a partner group follows the same Stufe-2 logic, no exception") and D-12
// ("same-group update / adding a partner group is always allowed") are both
// already true without any call-site-specific exception logic.
func diffRemovedReleaseVersionGroupIDs(current, new []int64) []int64 {
	keep := make(map[int64]struct{}, len(new))
	for _, id := range new {
		keep[id] = struct{}{}
	}
	removed := make([]int64, 0, len(current))
	for _, id := range current {
		if _, stillPresent := keep[id]; !stillPresent {
			removed = append(removed, id)
		}
	}
	return removed
}

// ensureReleaseVersionGroupsNotReducedToEmpty rejects a patch that would
// reduce a release version from one or more current groups down to zero new
// groups (D-06/D-14). A release version with zero current groups is not this
// function's concern (nothing to protect) and an unchanged/non-empty new
// count is always allowed.
func ensureReleaseVersionGroupsNotReducedToEmpty(currentCount, newCount int) error {
	if currentCount > 0 && newCount == 0 {
		return ErrReleaseVersionGroupsEmpty
	}
	return nil
}

// ensureRemovedReleaseVersionGroupsHaveNoDependents gates an actual group
// replacement/removal on every removed group having zero real dependents
// (D-01/D-07/D-08/D-09). Called with an empty removed slice -- the same-group
// update / add-only case -- it returns nil WITHOUT issuing any query.
func ensureRemovedReleaseVersionGroupsHaveNoDependents(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	removed []int64,
) error {
	for _, fansubGroupID := range removed {
		summary, err := countReleaseVersionGroupDependents(ctx, tx, releaseVersionID, fansubGroupID)
		if err != nil {
			return err
		}
		if summary.HasAny() {
			return &GroupHasDependentsError{FansubGroupID: fansubGroupID, Summary: summary}
		}
	}
	return nil
}
