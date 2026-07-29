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

const themeSegmentEpisodeOverrideColumns = `
	id,
	theme_segment_id,
	release_version_id,
	start_time::text,
	end_time::text,
	created_at,
	updated_at
`

// UpsertThemeSegmentEpisodeOverride legt einen Per-Release-Version-Zeit-Override
// fuer ein zugewiesenes Kara-Segment an oder aktualisiert ihn (Phase 117, D-01).
// Existiert fuer das (segmentID, releaseVersionID)-Paar keine Zuweisung in
// theme_segment_assignments, liefert die DB-seitige composite FK
// (fk_theme_segment_episode_override_assignment) einen 23503-Fehler, der hier
// in ErrConflict uebersetzt wird -- kein stiller Erfolg, kein generischer 500er.
func (r *AdminContentRepository) UpsertThemeSegmentEpisodeOverride(
	ctx context.Context,
	input models.AdminThemeSegmentEpisodeOverrideUpsertInput,
) (*models.AdminThemeSegmentEpisodeOverride, error) {
	if err := validateThemeSegmentEpisodeOverrideUpsertInput(input); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO theme_segment_episode_overrides (
			theme_segment_id,
			release_version_id,
			start_time,
			end_time,
			updated_at
		)
		VALUES ($1, $2, $3::interval, $4::interval, NOW())
		ON CONFLICT (theme_segment_id, release_version_id) DO UPDATE SET
			start_time = EXCLUDED.start_time,
			end_time = EXCLUDED.end_time,
			updated_at = NOW()
		RETURNING `+themeSegmentEpisodeOverrideColumns,
		input.ThemeSegmentID,
		input.ReleaseVersionID,
		strings.TrimSpace(input.StartTime),
		strings.TrimSpace(input.EndTime),
	)
	override, err := scanThemeSegmentEpisodeOverride(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("upsert theme segment episode override segment=%d release_version=%d: %w",
			input.ThemeSegmentID, input.ReleaseVersionID, err)
	}
	return override, nil
}

// DeleteThemeSegmentEpisodeOverride entfernt einen bestehenden
// Per-Release-Version-Zeit-Override.
func (r *AdminContentRepository) DeleteThemeSegmentEpisodeOverride(
	ctx context.Context,
	segmentID int64,
	releaseVersionID int64,
) error {
	if segmentID <= 0 || releaseVersionID <= 0 {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `
		DELETE FROM theme_segment_episode_overrides
		WHERE theme_segment_id = $1 AND release_version_id = $2
	`, segmentID, releaseVersionID)
	if err != nil {
		return fmt.Errorf("delete theme segment episode override segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetThemeSegmentEpisodeOverride liefert den Zeit-Override fuer ein
// (segmentID, releaseVersionID)-Paar, oder ErrNotFound, wenn keiner existiert.
func (r *AdminContentRepository) GetThemeSegmentEpisodeOverride(
	ctx context.Context,
	segmentID int64,
	releaseVersionID int64,
) (*models.AdminThemeSegmentEpisodeOverride, error) {
	if segmentID <= 0 || releaseVersionID <= 0 {
		return nil, ErrNotFound
	}

	row := r.db.QueryRow(ctx, `
		SELECT `+themeSegmentEpisodeOverrideColumns+`
		FROM theme_segment_episode_overrides
		WHERE theme_segment_id = $1 AND release_version_id = $2
	`, segmentID, releaseVersionID)
	return scanThemeSegmentEpisodeOverride(row)
}

// ListThemeSegmentEpisodeOverrides liefert alle Zeit-Overrides eines
// Kara-Segments ueber alle zugewiesenen Release-Versionen hinweg.
func (r *AdminContentRepository) ListThemeSegmentEpisodeOverrides(
	ctx context.Context,
	segmentID int64,
) ([]models.AdminThemeSegmentEpisodeOverride, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT `+themeSegmentEpisodeOverrideColumns+`
		FROM theme_segment_episode_overrides
		WHERE theme_segment_id = $1
		ORDER BY release_version_id ASC
	`, segmentID)
	if err != nil {
		return nil, fmt.Errorf("list theme segment episode overrides segment=%d: %w", segmentID, err)
	}
	defer rows.Close()

	items := make([]models.AdminThemeSegmentEpisodeOverride, 0)
	for rows.Next() {
		item, err := scanThemeSegmentEpisodeOverride(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list theme segment episode overrides rows segment=%d: %w", segmentID, err)
	}
	return items, nil
}

func validateThemeSegmentEpisodeOverrideUpsertInput(input models.AdminThemeSegmentEpisodeOverrideUpsertInput) error {
	if input.ThemeSegmentID <= 0 {
		return fmt.Errorf("theme segment episode override: theme_segment_id is required")
	}
	if input.ReleaseVersionID <= 0 {
		return fmt.Errorf("theme segment episode override: release_version_id is required")
	}
	if strings.TrimSpace(input.StartTime) == "" {
		return fmt.Errorf("theme segment episode override: start_time is required")
	}
	if strings.TrimSpace(input.EndTime) == "" {
		return fmt.Errorf("theme segment episode override: end_time is required")
	}
	return nil
}

func scanThemeSegmentEpisodeOverride(row pgx.Row) (*models.AdminThemeSegmentEpisodeOverride, error) {
	var item models.AdminThemeSegmentEpisodeOverride
	if err := row.Scan(
		&item.ID,
		&item.ThemeSegmentID,
		&item.ReleaseVersionID,
		&item.StartTime,
		&item.EndTime,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("scan theme segment episode override: %w", err)
	}
	return &item, nil
}
