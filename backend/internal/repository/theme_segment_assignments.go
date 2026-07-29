package repository

import (
	"context"
	"errors"
	"fmt"

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
