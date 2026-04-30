package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// ListFansubAnimeReleases gibt alle Fansub-Releases fuer eine Fansub-Anime-Kombination zurueck.
// Die Ergebnisse sind nach Episode-Sortierindex und Release-ID geordnet.
func (r *AdminContentRepository) ListFansubAnimeReleases(
	ctx context.Context,
	fansubGroupID int64,
	animeID int64,
) ([]models.AdminFansubReleaseSummary, error) {
	if fansubGroupID <= 0 || animeID <= 0 {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			fr.id                                       AS release_id,
			a.id                                        AS anime_id,
			a.title                                     AS anime_title,
			fg.id                                       AS fansub_group_id,
			fg.name                                     AS fansub_name,
			ep.id                                       AS episode_id,
			COALESCE(ep.episode_number, '')             AS episode_number,
			fr.source,
			(
				SELECT COUNT(*)
				FROM release_versions rv
				WHERE rv.release_id = fr.id
			)::int                                      AS version_count,
			EXISTS (
				SELECT 1
				FROM release_theme_assets rta
				WHERE rta.release_id = fr.id
			)                                           AS has_theme_assets,
			fr.created_at
		FROM fansub_releases fr
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN anime a ON a.id = ep.anime_id
		JOIN release_versions rv2 ON rv2.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv2.id
		JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		WHERE ep.anime_id = $2
		  AND rvg.fansub_group_id = $1
		GROUP BY
			fr.id, a.id, a.title, fg.id, fg.name,
			ep.id, ep.episode_number, fr.source, fr.created_at,
			ep.sort_index
		ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, fr.id
	`, fansubGroupID, animeID)
	if err != nil {
		return nil, fmt.Errorf("list fansub anime releases fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}
	defer rows.Close()

	items := make([]models.AdminFansubReleaseSummary, 0)
	for rows.Next() {
		var item models.AdminFansubReleaseSummary
		if err := rows.Scan(
			&item.ReleaseID,
			&item.AnimeID,
			&item.AnimeTitle,
			&item.FansubGroupID,
			&item.FansubName,
			&item.EpisodeID,
			&item.EpisodeNumber,
			&item.Source,
			&item.VersionCount,
			&item.HasThemeAssets,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan fansub anime release fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub anime releases fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}

	return items, nil
}

// GetCanonicalFansubAnimeReleaseSummary gibt den kanonischen Release-Anker fuer eine
// Fansub-Anime-Kombination als vollstaendige Release-Summary zurueck.
// Release ist nil, wenn kein Release-Anker fuer die gegebene Kombination existiert.
func (r *AdminContentRepository) GetCanonicalFansubAnimeReleaseSummary(
	ctx context.Context,
	fansubGroupID int64,
	animeID int64,
) (*models.CanonicalFansubAnimeReleaseResponse, error) {
	if fansubGroupID <= 0 || animeID <= 0 {
		return nil, ErrNotFound
	}

	resp := &models.CanonicalFansubAnimeReleaseResponse{
		FansubGroupID: fansubGroupID,
		AnimeID:       animeID,
	}

	var item models.AdminFansubReleaseSummary
	err := r.db.QueryRow(ctx, `
		SELECT
			fr.id                                       AS release_id,
			a.id                                        AS anime_id,
			a.title                                     AS anime_title,
			fg.id                                       AS fansub_group_id,
			fg.name                                     AS fansub_name,
			ep.id                                       AS episode_id,
			COALESCE(ep.episode_number, '')             AS episode_number,
			fr.source,
			(
				SELECT COUNT(*)
				FROM release_versions rv
				WHERE rv.release_id = fr.id
			)::int                                      AS version_count,
			EXISTS (
				SELECT 1
				FROM release_theme_assets rta
				WHERE rta.release_id = fr.id
			)                                           AS has_theme_assets,
			fr.created_at
		FROM fansub_releases fr
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN anime a ON a.id = ep.anime_id
		JOIN release_versions rv2 ON rv2.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv2.id
		JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		WHERE ep.anime_id = $2
		  AND rvg.fansub_group_id = $1
		GROUP BY
			fr.id, a.id, a.title, fg.id, fg.name,
			ep.id, ep.episode_number, fr.source, fr.created_at,
			ep.sort_index
		ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, fr.id
		LIMIT 1
	`, fansubGroupID, animeID).Scan(
		&item.ReleaseID,
		&item.AnimeID,
		&item.AnimeTitle,
		&item.FansubGroupID,
		&item.FansubName,
		&item.EpisodeID,
		&item.EpisodeNumber,
		&item.Source,
		&item.VersionCount,
		&item.HasThemeAssets,
		&item.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		// No canonical release anchor — return response with nil release.
		return resp, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get canonical fansub anime release summary fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}

	resp.Release = &item
	return resp, nil
}

// GetAdminReleaseByID gibt einen einzelnen Fansub-Release anhand seiner ID als
// vollstaendige AdminFansubReleaseSummary zurueck.
func (r *AdminContentRepository) GetAdminReleaseByID(
	ctx context.Context,
	releaseID int64,
) (*models.AdminFansubReleaseSummary, error) {
	if releaseID <= 0 {
		return nil, ErrNotFound
	}

	var item models.AdminFansubReleaseSummary
	err := r.db.QueryRow(ctx, `
		SELECT
			fr.id                                       AS release_id,
			a.id                                        AS anime_id,
			a.title                                     AS anime_title,
			COALESCE(MIN(fg.id), 0)                     AS fansub_group_id,
			COALESCE(MIN(fg.name), '')                  AS fansub_name,
			ep.id                                       AS episode_id,
			COALESCE(ep.episode_number, '')             AS episode_number,
			fr.source,
			(
				SELECT COUNT(*)
				FROM release_versions rv
				WHERE rv.release_id = fr.id
			)::int                                      AS version_count,
			EXISTS (
				SELECT 1
				FROM release_theme_assets rta
				WHERE rta.release_id = fr.id
			)                                           AS has_theme_assets,
			fr.created_at
		FROM fansub_releases fr
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN anime a ON a.id = ep.anime_id
		LEFT JOIN release_versions rv2 ON rv2.release_id = fr.id
		LEFT JOIN release_version_groups rvg ON rvg.release_version_id = rv2.id
		LEFT JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		WHERE fr.id = $1
		GROUP BY fr.id, a.id, a.title, ep.id, ep.episode_number, fr.source, fr.created_at
	`, releaseID).Scan(
		&item.ReleaseID,
		&item.AnimeID,
		&item.AnimeTitle,
		&item.FansubGroupID,
		&item.FansubName,
		&item.EpisodeID,
		&item.EpisodeNumber,
		&item.Source,
		&item.VersionCount,
		&item.HasThemeAssets,
		&item.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get admin release by id=%d: %w", releaseID, err)
	}

	return &item, nil
}
