package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

// ListDateNeighbors adds at most four advisory anchors per persisted group to the
// existing editor context. It accepts only a resolved real release-version ID.
// One set-based query compares each field independently; missing dates, different
// anime/group/version contexts and unordered non-numeric labels are excluded.
func (r *EpisodeVersionRepository) ListDateNeighbors(ctx context.Context, releaseVersionID int64) ([]models.EpisodeVersionDateNeighbor, error) {
	rows, err := r.db.Query(ctx, `
        WITH current_version AS (
            SELECT rev.id, e.anime_id, (CASE WHEN e.episode_number ~ '^[0-9]+$' THEN e.episode_number::numeric END) AS episode_number,
                COALESCE(NULLIF(BTRIM(rev.version), ''), '') AS version_label
            FROM release_versions rev
            JOIN fansub_releases fr ON fr.id = rev.release_id
            JOIN episodes e ON e.id = fr.episode_id
            WHERE rev.id = $1 AND e.episode_number ~ '^[0-9]+$'
        ), candidates AS (
            SELECT DISTINCT rvg.fansub_group_id, rev.id AS release_version_id,
                e.episode_number, (CASE WHEN e.episode_number ~ '^[0-9]+$' THEN e.episode_number::numeric END) AS episode_order,
                CASE WHEN (CASE WHEN e.episode_number ~ '^[0-9]+$' THEN e.episode_number::numeric END) < current_version.episode_number
                    THEN 'previous' ELSE 'next' END AS direction,
                dates.field, dates.day
            FROM current_version
            JOIN release_version_groups own_group ON own_group.release_version_id = current_version.id
            JOIN release_version_groups rvg ON rvg.fansub_group_id = own_group.fansub_group_id
            JOIN release_versions rev ON rev.id = rvg.release_version_id
            JOIN fansub_releases fr ON fr.id = rev.release_id
            JOIN episodes e ON e.id = fr.episode_id
            CROSS JOIN LATERAL (VALUES
                ('production_started_on', (rev.production_started_on AT TIME ZONE 'UTC')::date),
                ('release_date', (COALESCE(rev.release_date, fr.release_date) AT TIME ZONE 'UTC')::date)
            ) AS dates(field, day)
            WHERE e.anime_id = current_version.anime_id
                AND rev.id <> current_version.id
                AND COALESCE(NULLIF(BTRIM(rev.version), ''), '') = current_version.version_label
                AND e.episode_number ~ '^[0-9]+$'
                AND (CASE WHEN e.episode_number ~ '^[0-9]+$' THEN e.episode_number::numeric END) <> current_version.episode_number
                AND dates.day IS NOT NULL
        ), ranked AS (
            SELECT *, ROW_NUMBER() OVER (
                PARTITION BY fansub_group_id, field, direction
                ORDER BY CASE WHEN direction = 'previous' THEN day END DESC,
                    CASE WHEN direction = 'next' THEN day END ASC,
                    CASE WHEN direction = 'previous' THEN episode_order END DESC,
                    CASE WHEN direction = 'next' THEN episode_order END ASC,
                    release_version_id ASC
            ) AS position
            FROM candidates
        )
        SELECT fansub_group_id, field, direction, release_version_id,
            episode_number, TO_CHAR(day, 'YYYY-MM-DD')
        FROM ranked WHERE position = 1
        ORDER BY fansub_group_id, field, direction
    `, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("load date neighbors for release version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()
	result := make([]models.EpisodeVersionDateNeighbor, 0)
	for rows.Next() {
		var item models.EpisodeVersionDateNeighbor
		if err := rows.Scan(&item.FansubGroupID, &item.Field, &item.Direction,
			&item.ReleaseVersionID, &item.EpisodeNumber, &item.Date); err != nil {
			return nil, fmt.Errorf("scan date neighbor for release version %d: %w", releaseVersionID, err)
		}
		result = append(result, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read date neighbors for release version %d: %w", releaseVersionID, err)
	}
	return result, nil
}
