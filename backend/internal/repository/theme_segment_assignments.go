package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

	row := r.db.QueryRow(ctx, `
		INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
		VALUES ($1, $2)
		ON CONFLICT (theme_segment_id, release_version_id) DO UPDATE SET
			theme_segment_id = EXCLUDED.theme_segment_id
		RETURNING `+themeSegmentAssignmentColumns,
		segmentID, releaseVersionID,
	)
	assignment, err := scanThemeSegmentAssignment(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return nil, ErrConflict
		}
		if errors.Is(err, ErrNotFound) {
			return nil, fmt.Errorf("assign theme segment %d to release version %d: unexpected empty result", segmentID, releaseVersionID)
		}
		return nil, fmt.Errorf("assign theme segment %d to release version %d: %w", segmentID, releaseVersionID, err)
	}
	return assignment, nil
}

// AssignThemeSegmentToEpisodeRange stellt sicher, dass ein Kara-Segment ALLEN Release-Versionen
// zugewiesen ist, deren Episode im angegebenen Bereich [startEpisode, endEpisode] liegt (gleiche
// Fansub-Gruppe + Version). Quick-Task 260819-lm5 (Bereich-Auto-Zuweisung): start_episode/
// end_episode SIND der Mechanismus fuer die automatische Zuweisung beim Speichern (Create/Update),
// kein separater Button noetig. ADDITIV: bestehende Zuweisungen ausserhalb des Bereichs werden
// NICHT entfernt (verengt jemand den Bereich nachtraeglich, bleiben zuvor zugewiesene Folgen
// zugewiesen -- verhindert stilles Loeschen von ggf. bereits ueberschriebenen Zuweisungen; manuelles
// Entfernen bleibt ueber UnassignThemeSegmentFromReleaseVersion moeglich). Liefert NUR die NEU
// eingefuegten release_version_id's zurueck (fuer gezielten Render-Fan-out -- bereits zugewiesene
// Release-Versionen brauchen keinen erneuten Fan-out).
//
// Guard: bei fehlendem/ungueltigem Bereich (segmentID/animeID/fansubGroupID<=0 oder
// startEpisode/endEpisode<=0) wird kein Fan-out ausgefuehrt (nil, nil) -- verhindert versehentliches
// "allen Folgen aller Zeiten"-Zuweisen, wenn die Felder leer/ungesetzt sind.
//
// Enumeriert Ziel-release_version_id's ueber EXAKT das Join-Muster aus GetSegmentReleaseDuration
// (admin_content_anime_themes.go), damit beide Stellen bei gleichem Input immer dieselbe Menge an
// Release-Versionen sehen.
func (r *AdminContentRepository) AssignThemeSegmentToEpisodeRange(
	ctx context.Context,
	segmentID int64,
	animeID int64,
	fansubGroupID int64,
	version string,
	startEpisode int,
	endEpisode int,
) ([]int64, error) {
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

	rows, err := tx.Query(ctx, `
		SELECT DISTINCT rev.id
		FROM release_version_groups rvg
		JOIN release_versions rev ON rev.id = rvg.release_version_id
			AND COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1') = $3
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes ep ON ep.id = fr.episode_id AND ep.anime_id = $1
		WHERE rvg.fansub_group_id = $2
		  AND COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END) BETWEEN $4 AND $5
	`, animeID, fansubGroupID, normalizedVersion, startEpisode, endEpisode)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: enumerate targets: %w", segmentID, err)
	}
	targetReleaseVersionIDs := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d: scan target: %w", segmentID, err)
		}
		targetReleaseVersionIDs = append(targetReleaseVersionIDs, id)
	}
	rowsErr := rows.Err()
	rows.Close()
	if rowsErr != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: rows: %w", segmentID, rowsErr)
	}
	if len(targetReleaseVersionIDs) == 0 {
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("commit assign theme segment to episode range segment=%d: %w", segmentID, err)
		}
		return nil, nil
	}

	existingRows, err := tx.Query(ctx, `
		SELECT release_version_id FROM theme_segment_assignments
		WHERE theme_segment_id = $1 AND release_version_id = ANY($2)
	`, segmentID, targetReleaseVersionIDs)
	if err != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: load existing: %w", segmentID, err)
	}
	existing := make(map[int64]bool, len(targetReleaseVersionIDs))
	for existingRows.Next() {
		var id int64
		if err := existingRows.Scan(&id); err != nil {
			existingRows.Close()
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d: scan existing: %w", segmentID, err)
		}
		existing[id] = true
	}
	existingErr := existingRows.Err()
	existingRows.Close()
	if existingErr != nil {
		return nil, fmt.Errorf("assign theme segment to episode range segment=%d: existing rows: %w", segmentID, existingErr)
	}

	newlyAssigned := make([]int64, 0)
	for _, id := range targetReleaseVersionIDs {
		if existing[id] {
			continue
		}
		newlyAssigned = append(newlyAssigned, id)
	}

	for _, id := range newlyAssigned {
		if _, err := tx.Exec(ctx, `
			INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
			VALUES ($1, $2)
			ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING
		`, segmentID, id); err != nil {
			return nil, fmt.Errorf("assign theme segment to episode range segment=%d release_version=%d: %w", segmentID, id, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit assign theme segment to episode range segment=%d: %w", segmentID, err)
	}

	return newlyAssigned, nil
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
