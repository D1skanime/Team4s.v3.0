package repository

import (
	"context"
	"errors"
	"fmt"
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

func (r *EpisodeVersionRepository) GetByID(ctx context.Context, versionID int64) (*models.EpisodeVersion, error) {
	rows, err := r.db.Query(ctx, `
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
			COALESCE(
				json_agg(
					json_build_object('id', fg.id, 'slug', fg.slug, 'name', fg.name, 'logo_url', fg.logo_url)
					ORDER BY fg.name ASC, fg.id ASC
				) FILTER (WHERE fg.id IS NOT NULL),
				'[]'::json
			) AS fansub_groups
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes primary_episode ON primary_episode.id = fr.episode_id AND primary_episode.episode_number ~ '^[0-9]+$'
		LEFT JOIN release_variant_episodes rve_all ON rve_all.release_variant_id = rv.id
		LEFT JOIN episodes covered_episode ON covered_episode.id = rve_all.episode_id AND covered_episode.episode_number ~ '^[0-9]+$'
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id
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
			rv.modified_at
		ORDER BY rv.id ASC
	`, versionID)
	if err != nil {
		return nil, fmt.Errorf("get release version %d: %w", versionID, err)
	}
	defer rows.Close()

	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("get release version %d: %w", versionID, err)
		}
		return nil, ErrNotFound
	}
	item, _, err := scanReleaseVariantAsEpisodeVersion(rows, true)
	if err != nil {
		return nil, fmt.Errorf("scan release version %d: %w", versionID, err)
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

func (r *EpisodeVersionRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}
	return exists, nil
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
	var item models.ReleaseStreamSource
	if err := r.db.QueryRow(ctx, `
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
	`, versionID).Scan(
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

func normalizeReleaseAssetType(raw string) (models.ReleaseAssetType, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "video":
		return models.ReleaseAssetTypeVideo, true
	case "poster":
		return models.ReleaseAssetTypePoster, true
	case "banner":
		return models.ReleaseAssetTypeBanner, true
	case "logo":
		return models.ReleaseAssetTypeLogo, true
	case "background", "image":
		return models.ReleaseAssetTypeImage, true
	default:
		return models.ReleaseAssetTypeOther, true
	}
}

func normalizeReleaseAssetPublicPath(raw *string) *string {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}
	if strings.HasPrefix(trimmed, "http://") ||
		strings.HasPrefix(trimmed, "https://") ||
		strings.HasPrefix(trimmed, "/api/") ||
		strings.HasPrefix(trimmed, "/media/") {
		return &trimmed
	}
	if strings.HasPrefix(trimmed, "/app/media/") {
		path := "/media/" + strings.TrimPrefix(trimmed, "/app/media/")
		return &path
	}
	if strings.HasPrefix(trimmed, "media/") {
		path := "/" + trimmed
		return &path
	}
	return &trimmed
}
