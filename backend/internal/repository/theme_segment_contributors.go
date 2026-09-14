package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// SetThemeSegmentContributors reconciles the theme_segment_contributors selection for a
// segment against the CURRENT effective contributor set of its Origin release version
// (Phase 156, Plan 156-12/GAP-01, 156-UAT.md Nachtrag 2026-09-12 -- bestaetigter
// Datenmodell-Entscheid). Zulaessigkeit wird ausschliesslich gegen die EFFEKTIVE
// Contributor-Aufloesung geprueft (loadPublicEffectiveContributors), niemals gegen eine
// rohe anime_contributions-Abfrage, damit vererbte Anime-Default-Beitraege
// (release_version_id IS NULL) korrekt beruecksichtigt bleiben. All-or-nothing: sobald
// AUCH NUR EIN memberID nicht als effektiver Origin-Contributor aufloest, schlaegt der
// GESAMTE Aufruf mit ErrConflict fehl und schreibt NICHTS. "Keine Auswahl = keine
// personenbezogenen Segment-Credits" -- es gibt keinen Legacy-Fallback-Pfad, auch nicht
// vorübergehend.
func (r *AdminContentRepository) SetThemeSegmentContributors(
	ctx context.Context,
	segmentID int64,
	memberIDs []int64,
) (added int, removed int, err error) {
	if segmentID <= 0 {
		return 0, 0, ErrNotFound
	}

	seen := make(map[int64]struct{}, len(memberIDs))
	for _, memberID := range memberIDs {
		if memberID <= 0 {
			return 0, 0, ErrValidation
		}
		if _, dup := seen[memberID]; dup {
			return 0, 0, ErrValidation
		}
		seen[memberID] = struct{}{}
	}

	originReleaseVersionID, err := r.loadThemeSegmentOriginForContributors(ctx, segmentID)
	if err != nil {
		return 0, 0, err
	}
	if originReleaseVersionID == nil {
		// Ein Segment ohne Origin kann per Konstruktion keine Contributor-Auswahl
		// erhalten (156-UAT.md Auftragspunkt 2/14) -- unabhaengig davon, ob memberIDs
		// leer ist oder nicht.
		return 0, 0, ErrConflict
	}

	if len(seen) > 0 {
		effective, err := loadPublicEffectiveContributors(ctx, r.db, []int64{*originReleaseVersionID})
		if err != nil {
			return 0, 0, fmt.Errorf("set theme segment contributors segment=%d: load effective contributors: %w", segmentID, err)
		}
		validMemberIDs := make(map[int64]struct{}, len(effective[*originReleaseVersionID]))
		for _, contributor := range effective[*originReleaseVersionID] {
			validMemberIDs[contributor.MemberID] = struct{}{}
		}
		for memberID := range seen {
			if _, ok := validMemberIDs[memberID]; !ok {
				return 0, 0, ErrConflict
			}
		}
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("begin set theme segment contributors segment=%d: %w", segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	existingRows, err := tx.Query(ctx, `
		SELECT member_id FROM theme_segment_contributors WHERE theme_segment_id = $1
	`, segmentID)
	if err != nil {
		return 0, 0, fmt.Errorf("set theme segment contributors segment=%d: load existing: %w", segmentID, err)
	}
	existingIDs, err := collectInt64Column(existingRows)
	if err != nil {
		return 0, 0, fmt.Errorf("set theme segment contributors segment=%d: scan existing: %w", segmentID, err)
	}
	existingSet := make(map[int64]struct{}, len(existingIDs))
	for _, id := range existingIDs {
		existingSet[id] = struct{}{}
	}

	for memberID := range seen {
		if _, ok := existingSet[memberID]; ok {
			continue
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO theme_segment_contributors (theme_segment_id, member_id)
			VALUES ($1, $2)
			ON CONFLICT (theme_segment_id, member_id) DO NOTHING
		`, segmentID, memberID); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23503" {
				return 0, 0, ErrConflict
			}
			return 0, 0, fmt.Errorf("set theme segment contributors segment=%d member=%d: %w", segmentID, memberID, err)
		}
		added++
	}

	targetIDs := make([]int64, 0, len(seen))
	for id := range seen {
		targetIDs = append(targetIDs, id)
	}
	tag, err := tx.Exec(ctx, `
		DELETE FROM theme_segment_contributors
		WHERE theme_segment_id = $1
		  AND NOT (member_id = ANY($2))
	`, segmentID, targetIDs)
	if err != nil {
		return 0, 0, fmt.Errorf("set theme segment contributors segment=%d: delete excess: %w", segmentID, err)
	}
	removed = int(tag.RowsAffected())

	// Plan 156-18 (GAP-07): jedes erfolgreiche Speichern setzt den Vorauswahl-Merker --
	// unbedingt, auch bei einer leer gespeicherten Auswahl (memberIDs: []). COALESCE haelt einen
	// bereits gesetzten Merker unveraendert (idempotent bei wiederholtem Speichern); ein Admin,
	// der bewusst leer speichert, verhindert damit dauerhaft jede spaetere automatische
	// Vorauswahl (kein Auto-Refill, 156-UAT.md GAP-07 decision 3).
	if _, err := tx.Exec(ctx, `
		UPDATE theme_segments SET contributors_initialized_at = COALESCE(contributors_initialized_at, NOW()) WHERE id = $1
	`, segmentID); err != nil {
		return 0, 0, fmt.Errorf("set theme segment contributors segment=%d: set initialized marker: %w", segmentID, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, fmt.Errorf("commit set theme segment contributors segment=%d: %w", segmentID, err)
	}

	return added, removed, nil
}

// ListThemeSegmentContributorCandidates laedt die vollstaendige Admin-Kandidatenliste fuer
// die Segment-Contributor-Auswahl: jede Person, die aktuell effektiver Beitragender der
// Origin-Release-Version des Segments ist -- UNGEFILTERT nach
// permissions.SegmentCreditRoleCodes, weil die Admin-Auswahl bewusst auch
// Encoder-only-Beitragende referenzierbar macht (156-UAT.md Regressionsfall D), auch wenn
// diese nie oeffentlich als Segment-Credit erscheinen. Ein Segment ohne Origin liefert eine
// leere (nicht nil) Liste, keinen Fehler.
func (r *AdminContentRepository) ListThemeSegmentContributorCandidates(
	ctx context.Context,
	segmentID int64,
) ([]models.AdminThemeSegmentContributorCandidate, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	originReleaseVersionID, err := r.loadThemeSegmentOriginForContributors(ctx, segmentID)
	if err != nil {
		return nil, err
	}
	if originReleaseVersionID == nil {
		return []models.AdminThemeSegmentContributorCandidate{}, nil
	}

	effective, err := loadPublicEffectiveContributors(ctx, r.db, []int64{*originReleaseVersionID})
	if err != nil {
		return nil, fmt.Errorf("list theme segment contributor candidates segment=%d: load effective contributors: %w", segmentID, err)
	}

	selectedIDs, err := r.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
	if err != nil {
		return nil, fmt.Errorf("list theme segment contributor candidates segment=%d: load selection: %w", segmentID, err)
	}
	selectedSet := make(map[int64]struct{}, len(selectedIDs))
	for _, id := range selectedIDs {
		selectedSet[id] = struct{}{}
	}

	contributors := effective[*originReleaseVersionID]
	candidates := make([]models.AdminThemeSegmentContributorCandidate, 0, len(contributors))
	for _, contributor := range contributors {
		_, selected := selectedSet[contributor.MemberID]
		candidates = append(candidates, models.AdminThemeSegmentContributorCandidate{
			MemberID:   contributor.MemberID,
			Name:       contributor.Name,
			AvatarURL:  contributor.AvatarURL,
			RoleLabel:  contributor.RoleLabel,
			RoleCodes:  contributor.RoleCodes,
			MemberSlug: contributor.MemberSlug,
			Selected:   selected,
		})
	}
	// candidates erben die Sortierung von loadPublicEffectiveContributors (nach Name) --
	// keine zweite Sortierung noetig.
	return candidates, nil
}

// GetThemeSegmentContributorMemberIDs liest die aktuell gespeicherte Contributor-Auswahl
// eines Segments (nur die member_id's, aufsteigend sortiert).
func (r *AdminContentRepository) GetThemeSegmentContributorMemberIDs(ctx context.Context, segmentID int64) ([]int64, error) {
	rows, err := r.db.Query(ctx, `
		SELECT member_id FROM theme_segment_contributors WHERE theme_segment_id = $1 ORDER BY member_id
	`, segmentID)
	if err != nil {
		return nil, fmt.Errorf("get theme segment contributor member ids segment=%d: %w", segmentID, err)
	}
	return collectInt64Column(rows)
}

// loadThemeSegmentOriginForContributors laedt die aktuelle origin_release_version_id eines
// Segments. Liefert ErrNotFound, wenn das Segment nicht existiert; (nil, nil), wenn das
// Segment existiert, aber keine Origin gesetzt ist.
func (r *AdminContentRepository) loadThemeSegmentOriginForContributors(ctx context.Context, segmentID int64) (*int64, error) {
	var originReleaseVersionID *int64
	if err := r.db.QueryRow(ctx, `
		SELECT origin_release_version_id FROM theme_segments WHERE id = $1
	`, segmentID).Scan(&originReleaseVersionID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("load theme segment origin segment=%d: %w", segmentID, err)
	}
	return originReleaseVersionID, nil
}
