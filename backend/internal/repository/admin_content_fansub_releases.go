package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// ListFansubAnimeReleases gibt Fansub-Releases fuer eine Fansub-Anime-Kombination paginiert zurueck.
// Die Ergebnisse sind nach Episode-Sortierindex und Release-ID geordnet.
func (r *AdminContentRepository) ListFansubAnimeReleases(
	ctx context.Context,
	fansubGroupID int64,
	animeID int64,
) ([]models.AdminFansubReleaseSummary, int64, error) {
	if fansubGroupID <= 0 || animeID <= 0 {
		return nil, 0, ErrNotFound
	}
	return r.ListFansubAnimeReleasesPage(ctx, fansubGroupID, animeID, 1, 100)
}

// ListFansubAnimeReleasesPage gibt eine einzelne Seite der Fansub-Releases
// fuer eine Fansub-Anime-Kombination zurueck.
func (r *AdminContentRepository) ListFansubAnimeReleasesPage(
	ctx context.Context,
	fansubGroupID int64,
	animeID int64,
	page int,
	perPage int,
) ([]models.AdminFansubReleaseSummary, int64, error) {
	if fansubGroupID <= 0 || animeID <= 0 {
		return nil, 0, ErrNotFound
	}
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 30
	}
	offset := (page - 1) * perPage

	var total int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT fr.id)
		FROM fansub_releases fr
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN release_versions rv2 ON rv2.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv2.id
		WHERE ep.anime_id = $2
		  AND rvg.fansub_group_id = $1
	`, fansubGroupID, animeID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count fansub anime releases fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}
	if total == 0 {
		return []models.AdminFansubReleaseSummary{}, 0, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			fr.id                                       AS release_id,
			CASE
				WHEN COUNT(DISTINCT rv2.id) = 1 THEN MIN(rv2.id)
				ELSE 0
			END                                         AS release_version_id,
			a.id                                        AS anime_id,
			a.title                                     AS anime_title,
			fg.id                                       AS fansub_group_id,
			fg.name                                     AS fansub_name,
			ep.id                                       AS episode_id,
			COALESCE(ep.episode_number, '')             AS episode_number,
			ep.title                                    AS episode_title,
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
			(
				SELECT rv.duration_seconds
				FROM release_versions rev
				JOIN release_version_groups rvg_duration ON rvg_duration.release_version_id = rev.id
				JOIN release_variants rv ON rv.release_version_id = rev.id
				WHERE rev.release_id = fr.id
				  AND rvg_duration.fansub_group_id = $1
				ORDER BY rv.duration_seconds IS NOT NULL DESC, rev.id ASC, rv.id ASC
				LIMIT 1
			)                                           AS duration_seconds,
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
			ep.id, ep.episode_number, ep.title, fr.source, fr.created_at,
			ep.sort_index
		ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, fr.id
		LIMIT $3 OFFSET $4
	`, fansubGroupID, animeID, perPage, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list fansub anime releases fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}
	defer rows.Close()

	items := make([]models.AdminFansubReleaseSummary, 0)
	for rows.Next() {
		var item models.AdminFansubReleaseSummary
		if err := rows.Scan(
			&item.ReleaseID,
			&item.ReleaseVersionID,
			&item.AnimeID,
			&item.AnimeTitle,
			&item.FansubGroupID,
			&item.FansubName,
			&item.EpisodeID,
			&item.EpisodeNumber,
			&item.EpisodeTitle,
			&item.Source,
			&item.VersionCount,
			&item.HasThemeAssets,
			&item.DurationSeconds,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan fansub anime release fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate fansub anime releases fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}

	return items, total, nil
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
			CASE
				WHEN COUNT(DISTINCT rv2.id) = 1 THEN MIN(rv2.id)
				ELSE 0
			END                                         AS release_version_id,
			a.id                                        AS anime_id,
			a.title                                     AS anime_title,
			fg.id                                       AS fansub_group_id,
			fg.name                                     AS fansub_name,
			ep.id                                       AS episode_id,
			COALESCE(ep.episode_number, '')             AS episode_number,
			ep.title                                    AS episode_title,
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
			(
				SELECT rv.duration_seconds
				FROM release_versions rev
				JOIN release_version_groups rvg_duration ON rvg_duration.release_version_id = rev.id
				JOIN release_variants rv ON rv.release_version_id = rev.id
				WHERE rev.release_id = fr.id
				  AND rvg_duration.fansub_group_id = $1
				ORDER BY rv.duration_seconds IS NOT NULL DESC, rev.id ASC, rv.id ASC
				LIMIT 1
			)                                           AS duration_seconds,
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
			ep.id, ep.episode_number, ep.title, fr.source, fr.created_at,
			ep.sort_index
		ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, fr.id
		LIMIT 1
	`, fansubGroupID, animeID).Scan(
		&item.ReleaseID,
		&item.ReleaseVersionID,
		&item.AnimeID,
		&item.AnimeTitle,
		&item.FansubGroupID,
		&item.FansubName,
		&item.EpisodeID,
		&item.EpisodeNumber,
		&item.EpisodeTitle,
		&item.Source,
		&item.VersionCount,
		&item.HasThemeAssets,
		&item.DurationSeconds,
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
			CASE
				WHEN COUNT(DISTINCT rv2.id) = 1 THEN COALESCE(MIN(rv2.id), 0)
				ELSE 0
			END                                         AS release_version_id,
			a.id                                        AS anime_id,
			a.title                                     AS anime_title,
			COALESCE(MIN(fg.id), 0)                     AS fansub_group_id,
			COALESCE(MIN(fg.name), '')                  AS fansub_name,
			ep.id                                       AS episode_id,
			COALESCE(ep.episode_number, '')             AS episode_number,
			ep.title                                    AS episode_title,
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
			(
				SELECT rv.duration_seconds
				FROM release_versions rev
				JOIN release_variants rv ON rv.release_version_id = rev.id
				WHERE rev.release_id = fr.id
				ORDER BY rv.duration_seconds IS NOT NULL DESC, rev.id ASC, rv.id ASC
				LIMIT 1
			)                                           AS duration_seconds,
			fr.created_at
		FROM fansub_releases fr
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN anime a ON a.id = ep.anime_id
		LEFT JOIN release_versions rv2 ON rv2.release_id = fr.id
		LEFT JOIN release_version_groups rvg ON rvg.release_version_id = rv2.id
		LEFT JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		WHERE fr.id = $1
		GROUP BY fr.id, a.id, a.title, ep.id, ep.episode_number, ep.title, fr.source, fr.created_at
	`, releaseID).Scan(
		&item.ReleaseID,
		&item.ReleaseVersionID,
		&item.AnimeID,
		&item.AnimeTitle,
		&item.FansubGroupID,
		&item.FansubName,
		&item.EpisodeID,
		&item.EpisodeNumber,
		&item.EpisodeTitle,
		&item.Source,
		&item.VersionCount,
		&item.HasThemeAssets,
		&item.DurationSeconds,
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
