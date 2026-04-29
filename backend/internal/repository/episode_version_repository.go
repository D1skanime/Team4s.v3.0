package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

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
		LEFT JOIN fansub_groups fg ON fg.id = COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id)
		LEFT JOIN LATERAL (
			SELECT
				COUNT(ts.id)::INTEGER AS segment_count,
				COALESCE(BOOL_OR(ts.source_type = 'release_asset' AND NULLIF(BTRIM(ts.source_ref), '') IS NOT NULL), FALSE) AS has_segment_asset
			FROM theme_segments ts
			JOIN themes t ON t.id = ts.theme_id
			WHERE t.anime_id = primary_episode.anime_id
			  AND COALESCE(ts.fansub_group_id, 0) = COALESCE(COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id), 0)
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

func (r *EpisodeVersionRepository) GetByID(ctx context.Context, versionID int64) (*models.EpisodeVersion, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(CAST(primary_episode.episode_number AS INTEGER), 0) AS group_episode_number,
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
			COALESCE(rv.updated_at, rv.modified_at, rv.created_at) AS updated_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes primary_episode ON primary_episode.id = fr.episode_id AND primary_episode.episode_number ~ '^[0-9]+$'
		LEFT JOIN release_variant_episodes rve_all ON rve_all.release_variant_id = rv.id
		LEFT JOIN episodes covered_episode ON covered_episode.id = rve_all.episode_id AND covered_episode.episode_number ~ '^[0-9]+$'
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id
		LEFT JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
		LEFT JOIN fansub_groups fg ON fg.id = COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id)
		LEFT JOIN LATERAL (
			SELECT
				COUNT(ts.id)::INTEGER AS segment_count,
				COALESCE(BOOL_OR(ts.source_type = 'release_asset' AND NULLIF(BTRIM(ts.source_ref), '') IS NOT NULL), FALSE) AS has_segment_asset
			FROM theme_segments ts
			JOIN themes t ON t.id = ts.theme_id
			WHERE t.anime_id = primary_episode.anime_id
			  AND COALESCE(ts.fansub_group_id, 0) = COALESCE(COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id), 0)
			  AND COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1') = COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1')
			  AND (ts.start_episode IS NULL OR ts.start_episode <= CAST(primary_episode.episode_number AS INTEGER))
			  AND (ts.end_episode IS NULL OR ts.end_episode >= CAST(primary_episode.episode_number AS INTEGER))
		) seg ON TRUE
		WHERE rv.id = $1 OR rev.id = $1
		GROUP BY
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
			rv.modified_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		ORDER BY rv.id ASC
		LIMIT 1
	`, versionID)

	item, _, err := scanReleaseVariantAsEpisodeVersion(row, true)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get release version %d: %w", versionID, err)
	}
	return item, nil
}

func (r *EpisodeVersionRepository) Create(
	ctx context.Context,
	input models.EpisodeVersionCreateInput,
) (*models.EpisodeVersion, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin create release version tx anime=%d: %w", input.AnimeID, err)
	}
	defer tx.Rollback(ctx)

	episodeID, err := lookupEpisodeIDByAnimeAndNumber(ctx, tx, input.AnimeID, input.EpisodeNumber)
	if err != nil {
		return nil, err
	}
	sourceID, err := ensureReleaseSourceID(ctx, tx, input.MediaProvider)
	if err != nil {
		return nil, err
	}

	releaseID, err := createFansubRelease(ctx, tx, episodeID, sourceID)
	if err != nil {
		return nil, err
	}
	releaseVersionID, err := createReleaseVersion(ctx, tx, releaseID, nil, input.Title)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, err
	}
	if err := applyEpisodeVersionReleaseMetadata(ctx, tx, releaseVersionID, input.Title, input.ReleaseDate); err != nil {
		return nil, err
	}

	variantID, err := createReleaseVariant(ctx, tx, releaseVersionID, models.EpisodeImportMediaCandidate{
		MediaItemID:  input.MediaItemID,
		StreamURL:    input.StreamURL,
		VideoQuality: input.VideoQuality,
		FileName:     strings.TrimSpace(derefString(input.Title)),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, err
	}
	if err := applyEpisodeVersionVariantMetadata(ctx, tx, variantID, input.VideoQuality, input.SubtitleType, input.Title, input.DurationSeconds); err != nil {
		return nil, err
	}
	if err := ensureEpisodeVersionStream(ctx, tx, variantID, input.MediaProvider, input.MediaItemID, input.StreamURL); err != nil {
		return nil, err
	}
	if err := syncEpisodeVersionSelectedGroups(ctx, tx, releaseVersionID, input.AnimeID, input.FansubGroups, input.FansubGroupID, true); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_variant_episodes (release_variant_id, episode_id, position)
		VALUES ($1, $2, 1)
		ON CONFLICT (release_variant_id, episode_id) DO UPDATE
		SET position = EXCLUDED.position
	`, variantID, episodeID); err != nil {
		return nil, fmt.Errorf("link release coverage variant=%d episode=%d: %w", variantID, episodeID, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit create release version anime=%d episode=%d: %w", input.AnimeID, input.EpisodeNumber, err)
	}
	return r.GetByID(ctx, variantID)
}

func (r *EpisodeVersionRepository) Update(
	ctx context.Context,
	versionID int64,
	input models.EpisodeVersionPatchInput,
) (*models.EpisodeVersion, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin update release version tx version=%d: %w", versionID, err)
	}
	defer tx.Rollback(ctx)

	state, err := loadEpisodeVersionStateForUpdate(ctx, tx, versionID)
	if err != nil {
		return nil, err
	}

	title := state.Title
	if input.Title.Set {
		title = input.Title.Value
	}
	releaseDate := state.ReleaseDate
	if input.ReleaseDate.Set {
		releaseDate = input.ReleaseDate.Value
	}
	if input.Title.Set || input.ReleaseDate.Set {
		if err := applyEpisodeVersionReleaseMetadata(ctx, tx, state.ReleaseVersionID, title, releaseDate); err != nil {
			return nil, err
		}
	}

	videoQuality := state.VideoQuality
	if input.VideoQuality.Set {
		videoQuality = input.VideoQuality.Value
	}
	subtitleType := state.SubtitleType
	if input.SubtitleType.Set {
		subtitleType = input.SubtitleType.Value
	}
	durationSeconds := state.DurationSeconds
	if input.DurationSeconds.Set {
		durationSeconds = input.DurationSeconds.Value
	}
	if input.Title.Set || input.VideoQuality.Set || input.SubtitleType.Set || input.DurationSeconds.Set {
		if err := applyEpisodeVersionVariantMetadata(ctx, tx, state.VariantID, videoQuality, subtitleType, title, durationSeconds); err != nil {
			return nil, err
		}
	}

	mediaProvider := state.MediaProvider
	if input.MediaProvider.Set && input.MediaProvider.Value != nil {
		mediaProvider = *input.MediaProvider.Value
	}
	mediaItemID := state.MediaItemID
	if input.MediaItemID.Set && input.MediaItemID.Value != nil {
		mediaItemID = *input.MediaItemID.Value
	}
	streamURL := state.StreamURL
	if input.StreamURL.Set {
		streamURL = input.StreamURL.Value
	}
	if input.MediaProvider.Set || input.MediaItemID.Set || input.StreamURL.Set {
		sourceID, err := ensureReleaseSourceID(ctx, tx, mediaProvider)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_releases
			SET source_id = $1,
			    source = $1,
			    updated_at = NOW(),
			    modified_at = NOW()
			WHERE id = $2
		`, sourceID, state.ReleaseID); err != nil {
			return nil, fmt.Errorf("update release source release=%d: %w", state.ReleaseID, err)
		}
		if err := ensureEpisodeVersionStream(ctx, tx, state.VariantID, mediaProvider, mediaItemID, streamURL); err != nil {
			return nil, err
		}
	}

	if input.FansubGroups.Set || input.FansubGroupID.Set {
		var selectedGroups []models.SelectedFansubGroupInput
		var fansubGroupID *int64
		if input.FansubGroups.Set {
			selectedGroups = input.FansubGroups.Value
		}
		if input.FansubGroupID.Set {
			fansubGroupID = input.FansubGroupID.Value
		}
		if err := syncEpisodeVersionSelectedGroups(ctx, tx, state.ReleaseVersionID, state.AnimeID, selectedGroups, fansubGroupID, input.FansubGroups.Set || input.FansubGroupID.Set); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit update release version %d: %w", versionID, err)
	}
	return r.GetByID(ctx, state.VariantID)
}

func (r *EpisodeVersionRepository) Delete(ctx context.Context, versionID int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin delete release version tx %d: %w", versionID, err)
	}
	defer tx.Rollback(ctx)

	var variantID int64
	var releaseVersionID int64
	var releaseID int64
	if err := tx.QueryRow(ctx, `
		SELECT rv.id, rev.id, rev.release_id
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		WHERE rv.id = $1 OR rev.id = $1
		ORDER BY rv.id ASC
		LIMIT 1
	`, versionID).Scan(&variantID, &releaseVersionID, &releaseID); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("resolve delete release version target %d: %w", versionID, err)
	}

	streamSourceIDs := make([]int64, 0, 2)
	rows, err := tx.Query(ctx, `
		SELECT DISTINCT stream_source_id
		FROM release_streams
		WHERE variant_id = $1
		  AND stream_source_id IS NOT NULL
	`, variantID)
	if err != nil {
		return fmt.Errorf("query release stream sources variant=%d: %w", variantID, err)
	}
	for rows.Next() {
		var streamSourceID int64
		if err := rows.Scan(&streamSourceID); err != nil {
			rows.Close()
			return fmt.Errorf("scan release stream source variant=%d: %w", variantID, err)
		}
		streamSourceIDs = append(streamSourceIDs, streamSourceID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("iterate release stream sources variant=%d: %w", variantID, err)
	}
	rows.Close()

	if _, err := tx.Exec(ctx, `DELETE FROM release_variant_episodes WHERE release_variant_id = $1`, variantID); err != nil {
		return fmt.Errorf("delete release variant episodes variant=%d: %w", variantID, err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM release_streams WHERE variant_id = $1`, variantID); err != nil {
		return fmt.Errorf("delete release streams variant=%d: %w", variantID, err)
	}
	commandTag, err := tx.Exec(ctx, `DELETE FROM release_variants WHERE id = $1`, variantID)
	if err != nil {
		return fmt.Errorf("delete release variant %d: %w", variantID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	var remainingVariants int64
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM release_variants WHERE release_version_id = $1`, releaseVersionID).Scan(&remainingVariants); err != nil {
		return fmt.Errorf("count remaining release variants version=%d: %w", releaseVersionID, err)
	}
	if remainingVariants == 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID); err != nil {
			return fmt.Errorf("delete release version groups version=%d: %w", releaseVersionID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM release_versions WHERE id = $1`, releaseVersionID); err != nil {
			return fmt.Errorf("delete release version %d: %w", releaseVersionID, err)
		}

		var remainingReleaseVersions int64
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM release_versions WHERE release_id = $1`, releaseID).Scan(&remainingReleaseVersions); err != nil {
			return fmt.Errorf("count remaining release versions release=%d: %w", releaseID, err)
		}
		if remainingReleaseVersions == 0 {
			if _, err := tx.Exec(ctx, `DELETE FROM fansub_releases WHERE id = $1`, releaseID); err != nil {
				return fmt.Errorf("delete empty fansub release %d: %w", releaseID, err)
			}
		}
	}

	for _, streamSourceID := range streamSourceIDs {
		if _, err := tx.Exec(ctx, `
			DELETE FROM stream_sources ss
			WHERE ss.id = $1
			  AND NOT EXISTS (
				SELECT 1 FROM release_streams rs
				WHERE rs.stream_source_id = ss.id
			  )
		`, streamSourceID); err != nil {
			return fmt.Errorf("delete orphaned stream source %d after release delete: %w", streamSourceID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit delete release version %d: %w", versionID, err)
	}
	return nil
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

type episodeVersionWriteState struct {
	VariantID        int64
	ReleaseVersionID int64
	ReleaseID        int64
	AnimeID          int64
	Title            *string
	ReleaseDate      *time.Time
	VideoQuality     *string
	SubtitleType     *string
	DurationSeconds  *int32
	MediaProvider    string
	MediaItemID      string
	StreamURL        *string
}

func loadEpisodeVersionStateForUpdate(ctx context.Context, tx pgx.Tx, versionID int64) (*episodeVersionWriteState, error) {
	state := episodeVersionWriteState{}
	if err := tx.QueryRow(ctx, `
		SELECT
			rv.id,
			rev.id,
			fr.id,
			e.anime_id,
			rev.title,
			COALESCE(rev.release_date, fr.release_date) AS release_date,
			COALESCE(rv.video_quality, rv.resolution) AS video_quality,
			rv.subtitle_type,
			rv.duration_seconds,
			COALESCE(ss.provider_type, ''),
			COALESCE(ss.external_id, rs.jellyfin_item_id, ''),
			ss.url
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id
		WHERE rv.id = $1 OR rev.id = $1
		ORDER BY rv.id ASC
		LIMIT 1
		FOR UPDATE OF rv, rev, fr
	`, versionID).Scan(
		&state.VariantID,
		&state.ReleaseVersionID,
		&state.ReleaseID,
		&state.AnimeID,
		&state.Title,
		&state.ReleaseDate,
		&state.VideoQuality,
		&state.SubtitleType,
		&state.DurationSeconds,
		&state.MediaProvider,
		&state.MediaItemID,
		&state.StreamURL,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load release version state %d: %w", versionID, err)
	}
	return &state, nil
}

func lookupEpisodeIDByAnimeAndNumber(ctx context.Context, tx pgx.Tx, animeID int64, episodeNumber int32) (int64, error) {
	var episodeID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM episodes
		WHERE anime_id = $1 AND episode_number = $2
		ORDER BY id ASC
		LIMIT 1
		FOR UPDATE
	`, animeID, strconv.FormatInt(int64(episodeNumber), 10)).Scan(&episodeID); errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	} else if err != nil {
		return 0, fmt.Errorf("lookup episode anime=%d episode=%d: %w", animeID, episodeNumber, err)
	}
	return episodeID, nil
}

func ensureReleaseSourceID(ctx context.Context, tx pgx.Tx, provider string) (int64, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		return 0, fmt.Errorf("release source provider is required")
	}

	var sourceID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM release_sources
		WHERE LOWER(COALESCE(NULLIF(BTRIM(type), ''), NULLIF(BTRIM(source_type), ''), NULLIF(BTRIM(name), ''))) = LOWER($1)
		ORDER BY id ASC
		LIMIT 1
	`, provider).Scan(&sourceID); err == nil {
		return sourceID, nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return 0, fmt.Errorf("lookup release source provider=%s: %w", provider, err)
	}

	if err := tx.QueryRow(ctx, `
		INSERT INTO release_sources (name, source_type, type)
		VALUES ($1, $1, $1)
		RETURNING id
	`, provider).Scan(&sourceID); err != nil {
		return 0, fmt.Errorf("create release source provider=%s: %w", provider, err)
	}
	return sourceID, nil
}

func ensureEpisodeStreamTypeID(ctx context.Context, tx pgx.Tx) (int64, error) {
	var streamTypeID int64
	if err := tx.QueryRow(ctx, `SELECT id FROM stream_types WHERE name = 'episode' LIMIT 1`).Scan(&streamTypeID); err != nil {
		return 0, fmt.Errorf("lookup episode stream type: %w", err)
	}
	return streamTypeID, nil
}

func ensureEpisodeVersionStream(
	ctx context.Context,
	tx pgx.Tx,
	variantID int64,
	mediaProvider string,
	mediaItemID string,
	streamURL *string,
) error {
	streamTypeID, err := ensureEpisodeStreamTypeID(ctx, tx)
	if err != nil {
		return err
	}
	streamSourceID, err := ensureStreamSourceID(ctx, tx, mediaProvider, mediaItemID, streamURL)
	if err != nil {
		return err
	}
	if err := upsertNormalizedReleaseStream(ctx, tx, variantID, streamTypeID, streamSourceID, mediaItemID); err != nil {
		return fmt.Errorf("upsert release stream variant=%d: %w", variantID, err)
	}
	return nil
}

func ensureStreamSourceID(
	ctx context.Context,
	tx pgx.Tx,
	mediaProvider string,
	mediaItemID string,
	streamURL *string,
) (int64, error) {
	var streamSourceID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO stream_sources (provider_type, external_id, url)
		VALUES ($1, $2, $3)
		ON CONFLICT (provider_type, external_id) DO UPDATE
		SET url = COALESCE(EXCLUDED.url, stream_sources.url)
		RETURNING id
	`, mediaProvider, mediaItemID, streamURL).Scan(&streamSourceID); err != nil {
		return 0, fmt.Errorf("upsert stream source provider=%s media=%s: %w", mediaProvider, mediaItemID, err)
	}
	return streamSourceID, nil
}

func applyEpisodeVersionReleaseMetadata(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	title *string,
	releaseDate *time.Time,
) error {
	if _, err := tx.Exec(ctx, `
		UPDATE release_versions
		SET title = $1,
		    release_date = $2,
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = $3
	`, title, releaseDate, releaseVersionID); err != nil {
		return fmt.Errorf("update release version metadata version=%d: %w", releaseVersionID, err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE fansub_releases
		SET release_date = $1,
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = (SELECT release_id FROM release_versions WHERE id = $2)
	`, releaseDate, releaseVersionID); err != nil {
		return fmt.Errorf("update release metadata version=%d: %w", releaseVersionID, err)
	}
	return nil
}

func applyEpisodeVersionVariantMetadata(
	ctx context.Context,
	tx pgx.Tx,
	variantID int64,
	videoQuality *string,
	subtitleType *string,
	title *string,
	durationSeconds *int32,
) error {
	filename := strings.TrimSpace(derefString(title))
	container := strings.TrimPrefix(strings.ToLower(pathExt(filename)), ".")
	if _, err := tx.Exec(ctx, `
		UPDATE release_variants
		SET resolution = $1,
		    video_quality = $1,
		    subtitle_type = $2,
		    filename = NULLIF($3, ''),
		    container = NULLIF($4, ''),
		    duration_seconds = $5,
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = $6
	`, videoQuality, subtitleType, filename, container, durationSeconds, variantID); err != nil {
		return fmt.Errorf("update release variant metadata variant=%d: %w", variantID, err)
	}
	return nil
}

func syncEpisodeVersionSelectedGroups(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	animeID int64,
	fansubGroups []models.SelectedFansubGroupInput,
	fansubGroupID *int64,
	reset bool,
) error {
	if !reset {
		return nil
	}

	var selection *resolvedImportFansubSelection
	var err error
	switch {
	case len(fansubGroups) > 0:
		selection, err = resolveImportFansubSelectionFromInputs(ctx, tx, fansubGroups)
	case fansubGroupID != nil && *fansubGroupID > 0:
		selection = &resolvedImportFansubSelection{
			EffectiveGroup: &resolvedImportFansubGroup{ID: *fansubGroupID},
			MemberGroups:   []resolvedImportFansubGroup{{ID: *fansubGroupID}},
		}
	default:
		selection = nil
	}
	if err != nil {
		return err
	}
	if selection == nil || selection.EffectiveGroup == nil {
		if _, err := tx.Exec(ctx, `DELETE FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID); err != nil {
			return fmt.Errorf("clear release version groups version=%d: %w", releaseVersionID, err)
		}
		return nil
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_groups
		WHERE release_version_id = $1
		  AND COALESCE(fansubgroup_id, fansub_group_id) <> $2
	`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
		return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id, fansubgroup_id)
		VALUES ($1, $2, $2)
		ON CONFLICT (release_version_id, fansub_group_id) DO UPDATE
		SET fansubgroup_id = EXCLUDED.fansubgroup_id
	`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
		return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, selection.EffectiveGroup.ID, err)
	}
	return ensureAnimeFansubGroupLinks(ctx, tx, animeID, *selection)
}

func pathExt(value string) string {
	lastSlash := strings.LastIndexAny(value, `/\`)
	if lastSlash >= 0 {
		value = value[lastSlash+1:]
	}
	lastDot := strings.LastIndex(value, ".")
	if lastDot < 0 {
		return ""
	}
	return value[lastDot:]
}

func phase20ReleaseImportDeferred(action string, id int64) error {
	return fmt.Errorf("%s %d is deferred until Phase 20 release-native import writes are implemented", action, id)
}
