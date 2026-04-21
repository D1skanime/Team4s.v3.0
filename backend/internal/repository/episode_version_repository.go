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
	"github.com/jackc/pgx/v5/pgxpool"
)

type EpisodeVersionRepository struct {
	db *pgxpool.Pool
}

func NewEpisodeVersionRepository(db *pgxpool.Pool) *EpisodeVersionRepository {
	return &EpisodeVersionRepository{db: db}
}

func (r *EpisodeVersionRepository) ListGroupedByAnimeID(
	ctx context.Context,
	animeID int64,
	includeVersions bool,
	includeFansubs bool,
) (*models.GroupedEpisodesData, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	episodeTitlesByNumber, err := r.listEpisodeTitlesByAnimeID(ctx, animeID)
	if err != nil {
		return nil, err
	}
	versionCounts, err := r.countReleaseVariantsByEpisodeNumber(ctx, animeID)
	if err != nil {
		return nil, err
	}

	if !includeVersions {
		return &models.GroupedEpisodesData{
			AnimeID:  animeID,
			Episodes: buildGroupedEpisodeCounts(episodeTitlesByNumber, versionCounts),
		}, nil
	}

	grouped, err := r.listReleaseVariantsByAnimeID(ctx, animeID, includeFansubs, episodeTitlesByNumber)
	if err != nil {
		return nil, err
	}
	if len(grouped) == 0 {
		grouped = buildGroupedEpisodeCounts(episodeTitlesByNumber, versionCounts)
	}
	return &models.GroupedEpisodesData{AnimeID: animeID, Episodes: grouped}, nil
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
		LEFT JOIN fansub_groups fg ON fg.id = COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id)`
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
			ss.provider_type,
			ss.external_id,
			rs.jellyfin_item_id,
			rv.video_quality,
			rv.resolution,
			rv.subtitle_type,
			rev.release_date,
			fr.release_date,
			ss.url,
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

func (r *EpisodeVersionRepository) GetByID(ctx context.Context, versionID int64) (*models.EpisodeVersion, error) {
	return nil, phase20ReleaseImportDeferred("get release version", versionID)
}

func (r *EpisodeVersionRepository) Create(
	ctx context.Context,
	input models.EpisodeVersionCreateInput,
) (*models.EpisodeVersion, error) {
	return nil, phase20ReleaseImportDeferred("create release version", input.AnimeID)
}

func (r *EpisodeVersionRepository) Update(
	ctx context.Context,
	versionID int64,
	input models.EpisodeVersionPatchInput,
) (*models.EpisodeVersion, error) {
	return nil, phase20ReleaseImportDeferred("update release version", versionID)
}

func (r *EpisodeVersionRepository) Delete(ctx context.Context, versionID int64) error {
	return phase20ReleaseImportDeferred("delete release version", versionID)
}

func (r *EpisodeVersionRepository) DeleteByAnimeAndProvider(ctx context.Context, animeID int64, provider string) (int64, error) {
	return 0, phase20ReleaseImportDeferred("delete releases by provider", animeID)
}

func (r *EpisodeVersionRepository) DeleteByAnimeEpisodeNumberAndProvider(
	ctx context.Context,
	animeID int64,
	episodeNumber int32,
	provider string,
) (int64, error) {
	return 0, phase20ReleaseImportDeferred("delete episode releases by provider", animeID)
}

func (r *EpisodeVersionRepository) CountByAnimeAndProvider(ctx context.Context, animeID int64, provider string) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT rv.id)
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_streams rs ON rs.variant_id = rv.id
		JOIN stream_sources ss ON ss.id = rs.stream_source_id
		WHERE e.anime_id = $1 AND ss.provider_type = $2
	`, animeID, provider).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count release variants anime=%d provider=%s: %w", animeID, provider, err)
	}
	return count, nil
}

func (r *EpisodeVersionRepository) UpsertByMediaSource(
	ctx context.Context,
	input models.EpisodeVersionCreateInput,
	_ bool,
) (*models.EpisodeVersion, bool, error) {
	return nil, false, phase20ReleaseImportDeferred("upsert release by media source", input.AnimeID)
}

func (r *EpisodeVersionRepository) GetReleaseStreamSource(ctx context.Context, versionID int64) (*models.ReleaseStreamSource, error) {
	query := `
		SELECT
			COALESCE(rev.id, rv.id),
			e.anime_id,
			ss.provider_type,
			COALESCE(ss.external_id, rs.jellyfin_item_id, ''),
			ss.url
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_variants rv ON rv.release_version_id = rev.id
		JOIN release_streams rs ON rs.variant_id = rv.id
		JOIN stream_sources ss ON ss.id = rs.stream_source_id
		WHERE rev.id = $1 OR rv.id = $1
		ORDER BY rs.id ASC
		LIMIT 1
	`

	var item models.ReleaseStreamSource
	if err := r.db.QueryRow(ctx, query, versionID).Scan(
		&item.ID,
		&item.AnimeID,
		&item.MediaProvider,
		&item.MediaItemID,
		&item.StreamURL,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get release stream source %d: %w", versionID, err)
	}

	return &item, nil
}

func (r *EpisodeVersionRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}
	return exists, nil
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
		&item.MediaProvider,
		&item.MediaItemID,
		&item.CoveredEpisodeNumbers,
		&item.VideoQuality,
		&item.SubtitleType,
		&item.ReleaseDate,
		&item.StreamURL,
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
		item.FansubGroup = &models.FansubGroupSummary{
			ID:      *groupID,
			Slug:    *groupSlug,
			Name:    *groupName,
			LogoURL: groupLogoURL,
		}
	}
	return &item, groupEpisodeNumber, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func phase20ReleaseImportDeferred(action string, id int64) error {
	return fmt.Errorf("%s %d is deferred until Phase 20 release-native import writes are implemented", action, id)
}
