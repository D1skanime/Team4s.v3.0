package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// rowScanner is an abstraction over pgx.Row and pgx.Rows for scan functions.
type rowScanner interface {
	Scan(dest ...any) error
}

func (r *EpisodeVersionRepository) listEpisodeTitlesByAnimeID(
	ctx context.Context,
	animeID int64,
) (map[int32]*string, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT episode_number, title
		FROM episodes
		WHERE anime_id = $1
		  AND episode_number ~ '^[0-9]+$'
		`,
		animeID,
	)
	if err != nil {
		return nil, fmt.Errorf("query episode titles for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	result := make(map[int32]*string, 32)
	for rows.Next() {
		var episodeNumberRaw string
		var title *string
		if err := rows.Scan(&episodeNumberRaw, &title); err != nil {
			return nil, fmt.Errorf("scan episode title row for anime %d: %w", animeID, err)
		}

		episodeNumber, parseErr := strconv.Atoi(strings.TrimSpace(episodeNumberRaw))
		if parseErr != nil || episodeNumber <= 0 {
			continue
		}
		result[int32(episodeNumber)] = normalizeOptionalText(title)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate episode title rows for anime %d: %w", animeID, err)
	}

	return result, nil
}

func (r *EpisodeVersionRepository) countReleaseVariantsByEpisodeNumber(
	ctx context.Context,
	animeID int64,
) (map[int32]int32, error) {
	rows, err := r.db.Query(ctx, `
		SELECT CAST(e.episode_number AS INTEGER) AS episode_number, COUNT(DISTINCT rv.id) AS count
		FROM episodes e
		JOIN release_variant_episodes rve ON rve.episode_id = e.id
		JOIN release_variants rv ON rv.id = rve.release_variant_id
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		WHERE e.anime_id = $1 AND e.episode_number ~ '^[0-9]+$'
		GROUP BY CAST(e.episode_number AS INTEGER)
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query release variant counts for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	result := make(map[int32]int32, 32)
	for rows.Next() {
		var episodeNumber int32
		var count int32
		if err := rows.Scan(&episodeNumber, &count); err != nil {
			return nil, fmt.Errorf("scan release variant count row for anime %d: %w", animeID, err)
		}
		result[episodeNumber] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release variant counts for anime %d: %w", animeID, err)
	}

	return result, nil
}

func (r *EpisodeVersionRepository) listReleaseVariantsByAnimeID(
	ctx context.Context,
	animeID int64,
	includeFansubs bool,
	episodeTitlesByNumber map[int32]*string,
) ([]models.GroupedEpisode, error) {
	query := `
		SELECT
			CAST(primary_episode.episode_number AS INTEGER) AS group_episode_number,
			rv.id,
			primary_episode.anime_id,
			COALESCE(CAST(primary_episode.episode_number AS INTEGER), 0) AS episode_number,
			COALESCE(rev.title, primary_episode.title) AS title,
			NULLIF(BTRIM(rev.version), '') AS release_version,
			COALESCE(ss.provider_type, '') AS media_provider,
			COALESCE(ss.external_id, rs.jellyfin_item_id, '') AS media_item_id,
			COALESCE(
				ARRAY_AGG(CAST(covered_episode.episode_number AS INTEGER) ORDER BY rve_all.position, CAST(covered_episode.episode_number AS INTEGER))
					FILTER (WHERE covered_episode.episode_number ~ '^[0-9]+$'),
				ARRAY[CAST(primary_episode.episode_number AS INTEGER)]
			) AS covered_episode_numbers,
			COALESCE(rv.video_quality, rv.resolution) AS video_quality,
			rv.subtitle_type,
			COALESCE(rev.release_date, fr.release_date) AS release_date,
			ss.url AS stream_url,
			COALESCE(seg.segment_count, 0) AS segment_count,
			COALESCE(seg.has_segment_asset, FALSE) AS has_segment_asset,
			rv.duration_seconds,
			rv.created_at,
			COALESCE(rv.updated_at, rv.modified_at, rv.created_at) AS updated_at`

	if includeFansubs {
		query += `,
			fg.id, fg.slug, fg.name, fg.logo_url`
	}

	query += `
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes primary_episode ON primary_episode.id = fr.episode_id AND primary_episode.episode_number ~ '^[0-9]+$'
		LEFT JOIN release_variant_episodes rve_all ON rve_all.release_variant_id = rv.id
		LEFT JOIN episodes covered_episode ON covered_episode.id = rve_all.episode_id AND covered_episode.episode_number ~ '^[0-9]+$'
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id`

	if includeFansubs {
		query += `
		LEFT JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
		LEFT JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		LEFT JOIN LATERAL (
			SELECT
				COUNT(ts.id)::INTEGER AS segment_count,
				COALESCE(BOOL_OR(ts.source_type = 'release_asset' AND NULLIF(BTRIM(ts.source_ref), '') IS NOT NULL), FALSE) AS has_segment_asset
			FROM theme_segments ts
			JOIN themes t ON t.id = ts.theme_id
			WHERE t.anime_id = primary_episode.anime_id
			  AND COALESCE(ts.fansub_group_id, 0) = COALESCE(rvg.fansub_group_id, 0)
			  AND COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1') = COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1')
			  AND (ts.start_episode IS NULL OR ts.start_episode <= CAST(primary_episode.episode_number AS INTEGER))
			  AND (ts.end_episode IS NULL OR ts.end_episode >= CAST(primary_episode.episode_number AS INTEGER))
		) seg ON TRUE`
	} else {
		query += `
		LEFT JOIN LATERAL (
			SELECT 0::INTEGER AS segment_count, FALSE AS has_segment_asset
		) seg ON TRUE`
	}

	query += `
		WHERE primary_episode.anime_id = $1
		GROUP BY
			group_episode_number,
			rv.id,
			primary_episode.anime_id,
			primary_episode.episode_number,
			primary_episode.title,
			rev.title,
			rev.version,
			ss.provider_type,
			ss.external_id,
			rs.jellyfin_item_id,
			rv.video_quality,
			rv.resolution,
			rv.subtitle_type,
			rev.release_date,
			fr.release_date,
			ss.url,
			seg.segment_count,
			seg.has_segment_asset,
			rv.duration_seconds,
			rv.created_at,
			rv.updated_at,
			rv.modified_at`
	if includeFansubs {
		query += `,
			fg.id, fg.slug, fg.name, fg.logo_url`
	}
	query += `
		ORDER BY group_episode_number ASC, COALESCE(rev.release_date, fr.release_date) DESC NULLS LAST, rv.id ASC
	`

	rows, err := r.db.Query(ctx, query, animeID)
	if err != nil {
		return nil, fmt.Errorf("query release variants for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	groupMap := make(map[int32]*models.GroupedEpisode, 32)
	for rows.Next() {
		item, groupEpisodeNumber, scanErr := scanReleaseVariantAsEpisodeVersion(rows, includeFansubs)
		if scanErr != nil {
			return nil, scanErr
		}
		group, ok := groupMap[groupEpisodeNumber]
		if !ok {
			group = &models.GroupedEpisode{
				EpisodeNumber: groupEpisodeNumber,
				EpisodeTitle:  episodeTitlesByNumber[groupEpisodeNumber],
				Versions:      make([]models.EpisodeVersion, 0, 2),
			}
			groupMap[groupEpisodeNumber] = group
		}
		group.Versions = append(group.Versions, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release variant rows for anime %d: %w", animeID, err)
	}

	episodeNumbers := make([]int32, 0, len(groupMap))
	for episodeNumber := range groupMap {
		episodeNumbers = append(episodeNumbers, episodeNumber)
	}
	sort.Slice(episodeNumbers, func(i, j int) bool {
		return episodeNumbers[i] < episodeNumbers[j]
	})

	grouped := make([]models.GroupedEpisode, 0, len(groupMap))
	for _, episodeNumber := range episodeNumbers {
		group := groupMap[episodeNumber]
		group.VersionCount = int32(len(group.Versions))
		if len(group.Versions) > 0 {
			defaultID := group.Versions[0].ID
			group.DefaultVersionID = &defaultID
		}
		grouped = append(grouped, *group)
	}

	return grouped, nil
}

func buildGroupedEpisodeCounts(
	episodeTitlesByNumber map[int32]*string,
	versionCounts map[int32]int32,
) []models.GroupedEpisode {
	episodeNumbers := make([]int32, 0, len(episodeTitlesByNumber))
	for episodeNumber := range episodeTitlesByNumber {
		episodeNumbers = append(episodeNumbers, episodeNumber)
	}
	sort.Slice(episodeNumbers, func(i, j int) bool {
		return episodeNumbers[i] < episodeNumbers[j]
	})

	grouped := make([]models.GroupedEpisode, 0, len(episodeNumbers))
	for _, episodeNumber := range episodeNumbers {
		grouped = append(grouped, models.GroupedEpisode{
			EpisodeNumber: episodeNumber,
			EpisodeTitle:  episodeTitlesByNumber[episodeNumber],
			VersionCount:  versionCounts[episodeNumber],
		})
	}
	return grouped
}

func scanReleaseVariantAsEpisodeVersion(scanner rowScanner, includeFansub bool) (*models.EpisodeVersion, int32, error) {
	var item models.EpisodeVersion
	var groupEpisodeNumber int32
	var groupID *int64
	var groupSlug *string
	var groupName *string
	var groupLogoURL *string

	dest := []any{
		&groupEpisodeNumber,
		&item.ID,
		&item.AnimeID,
		&item.EpisodeNumber,
		&item.Title,
		&item.ReleaseVersion,
		&item.MediaProvider,
		&item.MediaItemID,
		&item.CoveredEpisodeNumbers,
		&item.VideoQuality,
		&item.SubtitleType,
		&item.ReleaseDate,
		&item.StreamURL,
		&item.SegmentCount,
		&item.HasSegmentAsset,
		&item.DurationSeconds,
		&item.CreatedAt,
		&item.UpdatedAt,
	}
	if includeFansub {
		dest = append(dest, &groupID, &groupSlug, &groupName, &groupLogoURL)
	}

	if err := scanner.Scan(dest...); err != nil {
		return nil, 0, fmt.Errorf("scan release variant row: %w", err)
	}
	if includeFansub && groupID != nil && groupSlug != nil && groupName != nil {
		item.FansubGroups = []models.FansubGroupSummary{{
			ID:      *groupID,
			Slug:    *groupSlug,
			Name:    *groupName,
			LogoURL: groupLogoURL,
		}}
	}
	return &item, groupEpisodeNumber, nil
}

func (r *EpisodeVersionRepository) ListReleaseAssets(ctx context.Context, releaseID int64) (*models.ReleaseAssetsData, error) {
	if releaseID <= 0 {
		return nil, ErrNotFound
	}

	var canonicalReleaseID int64
	err := r.db.QueryRow(ctx, `
		WITH candidates AS (
			SELECT fr.id, 0 AS priority
			FROM fansub_releases fr
			WHERE fr.id = $1
			UNION ALL
			SELECT fr.id, 1 AS priority
			FROM release_versions rev
			JOIN fansub_releases fr ON fr.id = rev.release_id
			WHERE rev.id = $1
			UNION ALL
			SELECT fr.id, 2 AS priority
			FROM release_variants rv
			JOIN release_versions rev ON rev.id = rv.release_version_id
			JOIN fansub_releases fr ON fr.id = rev.release_id
			WHERE rv.id = $1
		)
		SELECT id
		FROM candidates
		ORDER BY priority, id
		LIMIT 1
	`, releaseID).Scan(&canonicalReleaseID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("resolve release assets release=%d: %w", releaseID, err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			ma.id,
			COALESCE(NULLIF(mt.name, ''), 'other') AS media_type,
			COALESCE(NULLIF(ma.caption, ''), NULLIF(mt.name, ''), 'Release Media') AS title,
			COALESCE(
				NULLIF((SELECT mf.path FROM media_files mf WHERE mf.media_id = ma.id AND mf.variant = 'thumb' ORDER BY mf.id ASC LIMIT 1), ''),
				NULLIF(ma.file_path, '')
			) AS thumbnail_path,
			COALESCE(
				NULLIF((SELECT mf.path FROM media_files mf WHERE mf.media_id = ma.id AND (mf.variant = 'original' OR mf.variant IS NULL) ORDER BY mf.id ASC LIMIT 1), ''),
				NULLIF(ma.file_path, '')
			) AS asset_path,
			COALESCE(rm.sort_order, 0) AS sort_order
		FROM release_media rm
		JOIN media_assets ma ON ma.id = rm.media_id
		LEFT JOIN media_types mt ON mt.id = ma.media_type_id
		WHERE rm.release_id = $1
		ORDER BY COALESCE(rm.sort_order, 0), ma.id
	`, canonicalReleaseID)
	if err != nil {
		return nil, fmt.Errorf("list release assets release=%d: %w", canonicalReleaseID, err)
	}
	defer rows.Close()

	assets := make([]models.ReleaseAsset, 0)
	for rows.Next() {
		var id int64
		var mediaType string
		var title string
		var thumbnailPath *string
		var assetPath *string
		var sortOrder int32
		if err := rows.Scan(&id, &mediaType, &title, &thumbnailPath, &assetPath, &sortOrder); err != nil {
			return nil, fmt.Errorf("scan release asset release=%d: %w", canonicalReleaseID, err)
		}

		assetType, ok := normalizeReleaseAssetType(mediaType)
		if !ok {
			continue
		}
		thumbnailURL := normalizeReleaseAssetPublicPath(thumbnailPath)
		streamPath := normalizeReleaseAssetPublicPath(assetPath)
		if streamPath == nil {
			empty := ""
			streamPath = &empty
		}

		assets = append(assets, models.ReleaseAsset{
			ID:           fmt.Sprintf("%d", id),
			Type:         assetType,
			Title:        title,
			ThumbnailURL: thumbnailURL,
			Order:        sortOrder,
			StreamPath:   *streamPath,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release assets release=%d: %w", canonicalReleaseID, err)
	}

	return &models.ReleaseAssetsData{
		ReleaseID: canonicalReleaseID,
		Assets:    assets,
	}, nil
}

