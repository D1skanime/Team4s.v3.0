package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

const themeSegmentAssignmentColumns = `
	id,
	theme_segment_id,
	release_version_id,
	created_at
`

// AssignThemeSegmentToReleaseVersion weist ein geteiltes Kara-Segment einer
// konkreten Release-Version zu (Phase 117, D-03). Idempotent: ein
// wiederholter Aufruf mit denselben Argumenten legt keine Duplikatzeile an
// und liefert keinen Fehler.
func (r *AdminContentRepository) AssignThemeSegmentToReleaseVersion(
	ctx context.Context,
	segmentID int64,
	releaseVersionID int64,
) (*models.AdminThemeSegmentAssignment, error) {
	if segmentID <= 0 || releaseVersionID <= 0 {
		return nil, ErrConflict
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := lockSegmentAssignmentDomainTx(ctx, tx, segmentID); err != nil {
		return nil, err
	}
	assignment, err := assignThemeSegmentToReleaseVersionTx(ctx, tx, segmentID, releaseVersionID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return assignment, nil
}

// themeSegmentRangeTargetQuery enumeriert alle release_version_id's im angegebenen Episoden-Bereich
// (gleiche Fansub-Gruppe + Version) -- EXAKT das Join-Muster aus GetSegmentReleaseDuration
// (admin_content_anime_themes.go), damit beide Stellen bei gleichem Input immer dieselbe Menge an
// Release-Versionen sehen.
const themeSegmentRangeTargetQuery = `
	SELECT DISTINCT rev.id
	FROM release_version_groups rvg
	JOIN release_versions rev ON rev.id = rvg.release_version_id
		AND COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1') = $3
	JOIN fansub_releases fr ON fr.id = rev.release_id
	JOIN episodes ep ON ep.id = fr.episode_id AND ep.anime_id = $1
	WHERE rvg.fansub_group_id = $2
	  AND COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END) BETWEEN $4 AND $5
`

// themeSegmentDomainReleaseVersionIDsQuery ist derselbe Join wie themeSegmentRangeTargetQuery,
// aber OHNE den Episoden-Filter -- definiert die vollstaendige Anime/Gruppe/Version-Domaene, auf
// die die Loesch-Seite von AssignThemeSegmentToEpisodeRange jemals zugreifen darf (P156-03/T-156-05:
// verhindert, dass ein Assignment einer ANDEREN Domaene versehentlich geloescht wird).
const themeSegmentDomainReleaseVersionIDsQuery = `
	SELECT DISTINCT rev.id
	FROM release_version_groups rvg
	JOIN release_versions rev ON rev.id = rvg.release_version_id
		AND COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1') = $3
	JOIN fansub_releases fr ON fr.id = rev.release_id
	JOIN episodes ep ON ep.id = fr.episode_id AND ep.anime_id = $1
	WHERE rvg.fansub_group_id = $2
`

// collectInt64Column liest eine einzelne bigint-Spalte aus rows in einen Slice ein und schliesst
// rows in jedem Fall.
func collectInt64Column(rows pgx.Rows) ([]int64, error) {
	defer rows.Close()
	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return ids, nil
}

// AssignThemeSegmentToEpisodeRange ist die kanonische Soll-Ist-Synchronisation zwischen einem
// Kara-Segment und den ihm zugewiesenen Release-Versionen (Phase 156, Workstream A -- ersetzt die
// rein additive Semantik aus Quick-Task 260819-lm5). Ein Aufruf stellt sicher, dass GENAU die
// release_version_id's zugewiesen sind, deren Episode im angegebenen Bereich [startEpisode,
// endEpisode] liegt (gleiche Fansub-Gruppe + Version), soweit ihr OP-/ED-Platz frei ist.
// Belegte Ziele werden als SkippedConflicts gemeldet; eigene Zuweisungen bleiben idempotent.
// Fehlende freie Ziele werden ergaenzt (Added), ueberzaehlige
// werden entfernt (Removed) -- AUSSER ein Assignment traegt einen aktiven
// theme_segment_episode_overrides-Eintrag; ein solches Assignment wird NICHT geloescht und stattdessen
// sichtbar als ProtectedByOverride gemeldet (P156-03), weil ein Override der einzige heute vorhandene
// Beleg bewusster redaktioneller Arbeit an genau dieser (Segment, Release-Version)-Kombination ist.
// start_episode/end_episode SIND weiterhin der Mechanismus fuer die automatische Zuweisung beim
// Speichern (Create/Update), kein separater Button noetig.
//
// Guard: bei fehlendem/ungueltigem Bereich (segmentID/animeID/fansubGroupID<=0 oder
// startEpisode/endEpisode<=0) wird GAR NICHTS ausgefuehrt (nil, nil) -- dieser Guard ist die
// Anker-Bedingung fuer die Anforderung "ein unvollstaendiger Bereich loescht nichts": ein
// unvollstaendiger Bereich darf NIEMALS als "Soll-Menge = leer" interpretiert und dadurch faelschlich
// zum Loeschen aller Zuweisungen fuehren. Der Guard laeuft VOR jedem DB-Zugriff (bewiesen durch
// TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess mit nil-db-Feld).
//
// Die Entfernung wirkt ausschliesslich auf Assignments derselben Anime/Gruppe/Version-Domaene
// (themeSegmentDomainReleaseVersionIDsQuery) -- Assignments ausserhalb dieser Domaene werden nie
// angefasst (P156-03/T-156-05).
func (r *AdminContentRepository) AssignThemeSegmentToEpisodeRange(
	ctx context.Context,
	segmentID int64,
	animeID int64,
	fansubGroupID int64,
	version string,
	startEpisode int,
	endEpisode int,
) (*models.ThemeSegmentAssignmentSyncResult, error) {
	if segmentID <= 0 || animeID <= 0 || fansubGroupID <= 0 || startEpisode <= 0 || endEpisode <= 0 {
		return nil, nil
	}

	normalizedVersion := strings.TrimSpace(version)
	if normalizedVersion == "" {
		normalizedVersion = "v1"
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin assign theme segment to episode range segment=%d: %w", segmentID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	actualAnimeID, err := lockSegmentAssignmentDomainTx(ctx, tx, segmentID)
	if err != nil {
		return nil, err
	}
	if actualAnimeID != animeID {
		return nil, ErrConflict
	}
	result, err := r.assignThemeSegmentToEpisodeRangeTx(ctx, tx, segmentID, animeID, fansubGroupID, normalizedVersion, startEpisode, endEpisode)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *AdminContentRepository) assignThemeSegmentToEpisodeRangeTx(ctx context.Context, tx pgx.Tx, segmentID, animeID, fansubGroupID int64, normalizedVersion string, startEpisode, endEpisode int) (*models.ThemeSegmentAssignmentSyncResult, error) {
	targetRows, err := tx.Query(ctx, themeSegmentRangeTargetQuery, animeID, fansubGroupID, normalizedVersion, startEpisode, endEpisode)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: enumerate targets: %w", segmentID, err)
	}
	targetReleaseVersionIDs, err := collectInt64Column(targetRows)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: scan targets: %w", segmentID, err)
	}
	targetSet := make(map[int64]bool, len(targetReleaseVersionIDs))
	for _, id := range targetReleaseVersionIDs {
		targetSet[id] = true
	}

	domainRows, err := tx.Query(ctx, themeSegmentDomainReleaseVersionIDsQuery, animeID, fansubGroupID, normalizedVersion)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: enumerate domain: %w", segmentID, err)
	}
	domainReleaseVersionIDs, err := collectInt64Column(domainRows)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: scan domain: %w", segmentID, err)
	}

	existingRows, err := tx.Query(ctx, `
		SELECT release_version_id FROM theme_segment_assignments WHERE theme_segment_id = $1
	`, segmentID)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: load existing: %w", segmentID, err)
	}
	existingAssignmentIDs, err := collectInt64Column(existingRows)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: scan existing: %w", segmentID, err)
	}
	existingSet := make(map[int64]bool, len(existingAssignmentIDs))
	for _, id := range existingAssignmentIDs {
		existingSet[id] = true
	}

	slotType, err := segmentAssignmentTypeTx(ctx, tx, segmentID)
	if err != nil {
		return nil, err
	}
	conflicts, err := segmentAssignmentConflictsTx(ctx, tx, []int64{segmentID}, slotType, targetReleaseVersionIDs)
	if err != nil {
		return nil, err
	}
	skipped := make([]models.ThemeSegmentAssignmentConflict, 0, len(conflicts))
	occupied := make(map[int64]bool, len(conflicts))
	for _, conflict := range conflicts {
		if !existingSet[conflict.ReleaseVersionID] {
			occupied[conflict.ReleaseVersionID] = true
			skipped = append(skipped, conflict)
		}
	}
	if len(targetReleaseVersionIDs) > 0 && len(occupied) == len(targetReleaseVersionIDs) {
		return nil, ErrSegmentAssignmentConflict
	}
	newlyAssigned := make([]int64, 0)
	for _, id := range targetReleaseVersionIDs {
		if !existingSet[id] && !occupied[id] {
			newlyAssigned = append(newlyAssigned, id)
		}
	}
	if len(newlyAssigned) > 0 {
		if _, err := tx.Exec(ctx, `
            INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
            SELECT $1, unnest($2::bigint[])
            ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING`, segmentID, newlyAssigned); err != nil {
			return nil, fmt.Errorf("assign segment range segment=%d: %w", segmentID, err)
		}
	}

	// Loeschkandidaten: bestehende Zuweisungen INNERHALB der Anime/Gruppe/Version-Domaene, aber
	// ausserhalb des neuen Ziel-Bereichs. Ein Assignment ausserhalb der Domaene (z.B. eine andere
	// Fansub-Gruppe oder Version) wird nie ein Kandidat -- unabhaengig vom Ziel-Bereich (P156-03/T-156-05).
	domainSet := make(map[int64]bool, len(domainReleaseVersionIDs))
	for _, id := range domainReleaseVersionIDs {
		domainSet[id] = true
	}
	deletionCandidates := make([]int64, 0)
	for _, id := range existingAssignmentIDs {
		if domainSet[id] && !targetSet[id] {
			deletionCandidates = append(deletionCandidates, id)
		}
	}

	toRemove := make([]int64, 0)
	protectedByOverride := make([]int64, 0)
	if len(deletionCandidates) > 0 {
		// Pattern 2 (156-RESEARCH.md): ein einziger LEFT JOIN statt einer Pro-Zeile-Override-Abfrage
		// (kein N+1, siehe nonOverriddenSegmentAssignments-Anti-Pattern). o.id IS NULL selektiert
		// GENAU die Kandidaten, die geloescht werden duerfen.
		protectionRows, err := tx.Query(ctx, `
			SELECT tsa.release_version_id
			FROM theme_segment_assignments tsa
			LEFT JOIN theme_segment_episode_overrides o
			  ON o.theme_segment_id = tsa.theme_segment_id
			 AND o.release_version_id = tsa.release_version_id
			WHERE tsa.theme_segment_id = $1
			  AND tsa.release_version_id = ANY($2)
			  AND o.id IS NULL
		`, segmentID, deletionCandidates)
		if err != nil {
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d: override protection query: %w", segmentID, err)
		}
		toRemoveIDs, err := collectInt64Column(protectionRows)
		if err != nil {
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d: scan override protection: %w", segmentID, err)
		}
		toRemoveSet := make(map[int64]bool, len(toRemoveIDs))
		for _, id := range toRemoveIDs {
			toRemoveSet[id] = true
		}
		for _, id := range deletionCandidates {
			if toRemoveSet[id] {
				toRemove = append(toRemove, id)
			} else {
				protectedByOverride = append(protectedByOverride, id)
			}
		}
	}

	if len(toRemove) > 0 {
		kept := make([]int64, 0, len(targetReleaseVersionIDs)+len(protectedByOverride))
		kept = append(kept, targetReleaseVersionIDs...)
		kept = append(kept, protectedByOverride...)

		// AND release_version_id = ANY($2) (domainReleaseVersionIDs) ist tragend: es verhindert,
		// dass dieses DELETE JEMALS ein Assignment einer anderen Anime/Gruppe/Version-Domaene
		// entfernt, unabhaengig davon, was in $3 (kept) steht (P156-03/T-156-05).
		if _, err := tx.Exec(ctx, `
			DELETE FROM theme_segment_assignments
			WHERE theme_segment_id = $1
			  AND release_version_id = ANY($2)
			  AND NOT (release_version_id = ANY($3))
		`, segmentID, domainReleaseVersionIDs, kept); err != nil {
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d: delete stale assignments: %w", segmentID, err)
		}

		// Gezielte Aufraeumarbeiten (156-CONTEXT.md) fuer die tatsaechlich entfernten
		// Release-Versionen -- transaktional, nicht pauschal ueber das ganze Segment.
		if _, err := tx.Exec(ctx, `
			DELETE FROM theme_segment_playback_sources
			WHERE theme_segment_id = $1 AND release_version_id = ANY($2)
		`, segmentID, toRemove); err != nil {
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d: delete stale playback sources: %w", segmentID, err)
		}
		if _, err := tx.Exec(ctx, `
			DELETE FROM theme_segment_render_cache
			WHERE theme_segment_id = $1 AND release_version_id = ANY($2)
		`, segmentID, toRemove); err != nil {
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d: delete stale render cache: %w", segmentID, err)
		}
	}

	return &models.ThemeSegmentAssignmentSyncResult{
		Added:               newlyAssigned,
		Removed:             toRemove,
		ProtectedByOverride: protectedByOverride,
		SkippedConflicts:    skipped,
	}, nil
}

// UnassignThemeSegmentFromReleaseVersion entfernt die Zuweisung eines
// Kara-Segments zu einer Release-Version. Ein eventuell vorhandener
// Zeit-Override fuer dasselbe Paar wird durch die DB-seitige
// ON DELETE CASCADE-FK (theme_segment_episode_overrides ->
// theme_segment_assignments) automatisch mitentfernt.
func (r *AdminContentRepository) UnassignThemeSegmentFromReleaseVersion(
	ctx context.Context,
	segmentID int64,
	releaseVersionID int64,
) error {
	if segmentID <= 0 || releaseVersionID <= 0 {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `
		DELETE FROM theme_segment_assignments
		WHERE theme_segment_id = $1 AND release_version_id = $2
	`, segmentID, releaseVersionID)
	if err != nil {
		return fmt.Errorf("unassign theme segment %d from release version %d: %w", segmentID, releaseVersionID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListThemeSegmentAssignments liefert alle release_version_id-Werte, denen
// ein Kara-Segment aktuell zugewiesen ist, aufsteigend sortiert.
func (r *AdminContentRepository) ListThemeSegmentAssignments(ctx context.Context, segmentID int64) ([]int64, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT release_version_id
		FROM theme_segment_assignments
		WHERE theme_segment_id = $1
		ORDER BY release_version_id ASC
	`, segmentID)
	if err != nil {
		return nil, fmt.Errorf("list theme segment assignments segment=%d: %w", segmentID, err)
	}
	defer rows.Close()

	items := make([]int64, 0)
	for rows.Next() {
		var releaseVersionID int64
		if err := rows.Scan(&releaseVersionID); err != nil {
			return nil, fmt.Errorf("scan theme segment assignment segment=%d: %w", segmentID, err)
		}
		items = append(items, releaseVersionID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list theme segment assignments rows segment=%d: %w", segmentID, err)
	}
	return items, nil
}

func scanThemeSegmentAssignment(row pgx.Row) (*models.AdminThemeSegmentAssignment, error) {
	var item models.AdminThemeSegmentAssignment
	if err := row.Scan(
		&item.ID,
		&item.ThemeSegmentID,
		&item.ReleaseVersionID,
		&item.CreatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("scan theme segment assignment: %w", err)
	}
	return &item, nil
}
