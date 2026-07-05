package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

const themeSegmentRenderCacheColumns = `
	id,
	theme_segment_id,
	playback_source_id,
	cache_key,
	source_kind,
	source_fingerprint,
	render_profile,
	status,
	output_path,
	mime_type,
	duration_seconds,
	video_codec,
	audio_codec,
	subtitle_stream_index,
	subtitle_codec,
	error_code,
	error_message,
	attempts,
	queued_at,
	started_at,
	completed_at,
	invalidated_at,
	created_at,
	updated_at
`

func (r *AdminContentRepository) UpsertThemeSegmentRenderCacheQueued(
	ctx context.Context,
	input models.ThemeSegmentRenderCacheUpsertInput,
) (*models.ThemeSegmentRenderCache, error) {
	if err := validateThemeSegmentRenderCacheUpsertInput(input); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO theme_segment_render_cache (
			theme_segment_id,
			playback_source_id,
			cache_key,
			source_kind,
			source_fingerprint,
			render_profile,
			status,
			queued_at,
			started_at,
			completed_at,
			invalidated_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, 'queued', NOW(), NULL, NULL, NULL, NOW())
		ON CONFLICT (cache_key) DO UPDATE SET
			theme_segment_id = EXCLUDED.theme_segment_id,
			playback_source_id = EXCLUDED.playback_source_id,
			source_kind = EXCLUDED.source_kind,
			source_fingerprint = EXCLUDED.source_fingerprint,
			render_profile = EXCLUDED.render_profile,
			status = 'queued',
			output_path = NULL,
			mime_type = NULL,
			duration_seconds = NULL,
			video_codec = NULL,
			audio_codec = NULL,
			subtitle_stream_index = NULL,
			subtitle_codec = NULL,
			error_code = NULL,
			error_message = NULL,
			queued_at = NOW(),
			started_at = NULL,
			completed_at = NULL,
			invalidated_at = NULL,
			updated_at = NOW()
		RETURNING `+themeSegmentRenderCacheColumns,
		input.ThemeSegmentID,
		input.PlaybackSourceID,
		strings.TrimSpace(input.CacheKey),
		strings.TrimSpace(input.SourceKind),
		strings.TrimSpace(input.SourceFingerprint),
		strings.TrimSpace(input.RenderProfile),
	)
	return scanThemeSegmentRenderCache(row)
}

func (r *AdminContentRepository) GetThemeSegmentRenderCacheByKey(
	ctx context.Context,
	cacheKey string,
) (*models.ThemeSegmentRenderCache, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+themeSegmentRenderCacheColumns+`
		FROM theme_segment_render_cache
		WHERE cache_key = $1
	`, strings.TrimSpace(cacheKey))
	return scanThemeSegmentRenderCache(row)
}

func (r *AdminContentRepository) GetReadyThemeSegmentRenderCache(
	ctx context.Context,
	segmentID int64,
) (*models.ThemeSegmentRenderCache, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	row := r.db.QueryRow(ctx, `
		SELECT `+themeSegmentRenderCacheColumns+`
		FROM theme_segment_render_cache
		WHERE theme_segment_id = $1
		  AND status = 'ready'
		  AND invalidated_at IS NULL
		ORDER BY completed_at DESC NULLS LAST, id DESC
		LIMIT 1
	`, segmentID)
	return scanThemeSegmentRenderCache(row)
}

func (r *AdminContentRepository) GetLatestThemeSegmentRenderCache(
	ctx context.Context,
	segmentID int64,
) (*models.ThemeSegmentRenderCache, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	row := r.db.QueryRow(ctx, `
		SELECT `+themeSegmentRenderCacheColumns+`
		FROM theme_segment_render_cache
		WHERE theme_segment_id = $1
		  AND invalidated_at IS NULL
		ORDER BY updated_at DESC, id DESC
		LIMIT 1
	`, segmentID)
	return scanThemeSegmentRenderCache(row)
}

func (r *AdminContentRepository) GetThemeSegmentRenderSource(
	ctx context.Context,
	segmentID int64,
) (*models.ThemeSegmentRenderSource, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	var item models.ThemeSegmentRenderSource
	if err := r.db.QueryRow(ctx, `
		SELECT
			ts.id,
			t.anime_id,
			tps.id,
			tps.source_kind,
			tps.release_variant_id,
			tps.jellyfin_item_id,
			tps.media_asset_id,
			COALESCE(NULLIF(tps.source_ref, ''), ma.file_path),
			tps.source_label,
			tps.start_offset_seconds,
			tps.end_offset_seconds,
			tps.duration_seconds,
			ss.provider_type,
			COALESCE(NULLIF(ss.external_id, ''), NULLIF(rs.jellyfin_item_id, '')),
			ss.url,
			rev.title
		FROM theme_segments ts
		JOIN themes t ON t.id = ts.theme_id
		JOIN theme_segment_playback_sources tps ON tps.theme_segment_id = ts.id
		LEFT JOIN release_variants rv ON rv.id = tps.release_variant_id
		LEFT JOIN release_versions rev ON rev.id = rv.release_version_id
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id
		LEFT JOIN media_assets ma ON ma.id = tps.media_asset_id
		WHERE ts.id = $1
		ORDER BY
			CASE WHEN ss.provider_type = 'jellyfin' THEN 0 ELSE 1 END,
			rs.id ASC NULLS LAST
		LIMIT 1
	`, segmentID).Scan(
		&item.SegmentID,
		&item.AnimeID,
		&item.PlaybackSourceID,
		&item.SourceKind,
		&item.ReleaseVariantID,
		&item.JellyfinItemID,
		&item.MediaAssetID,
		&item.MediaAssetPath,
		&item.SourceLabel,
		&item.StartOffsetSeconds,
		&item.EndOffsetSeconds,
		&item.DurationSeconds,
		&item.StreamProvider,
		&item.StreamExternalID,
		&item.StreamURL,
		&item.ReleaseVariantTitle,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get theme segment render source segment=%d: %w", segmentID, err)
	}

	return &item, nil
}

func (r *AdminContentRepository) MarkThemeSegmentRenderCacheRendering(ctx context.Context, cacheKey string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE theme_segment_render_cache
		SET status = 'rendering',
		    attempts = attempts + 1,
		    started_at = NOW(),
		    completed_at = NULL,
		    invalidated_at = NULL,
		    error_code = NULL,
		    error_message = NULL,
		    updated_at = NOW()
		WHERE cache_key = $1
	`, strings.TrimSpace(cacheKey))
	if err != nil {
		return fmt.Errorf("mark theme segment render cache rendering %q: %w", cacheKey, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AdminContentRepository) MarkThemeSegmentRenderCacheReady(
	ctx context.Context,
	input models.ThemeSegmentRenderCacheReadyInput,
) error {
	if strings.TrimSpace(input.CacheKey) == "" ||
		strings.TrimSpace(input.OutputPath) == "" ||
		strings.TrimSpace(input.MimeType) == "" ||
		input.DurationSeconds <= 0 ||
		strings.TrimSpace(input.VideoCodec) == "" ||
		strings.TrimSpace(input.AudioCodec) == "" {
		return fmt.Errorf("mark theme segment render cache ready: invalid input")
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE theme_segment_render_cache
		SET status = 'ready',
		    output_path = $2,
		    mime_type = $3,
		    duration_seconds = $4,
		    video_codec = $5,
		    audio_codec = $6,
		    subtitle_stream_index = $7,
		    subtitle_codec = $8,
		    error_code = NULL,
		    error_message = NULL,
		    completed_at = NOW(),
		    invalidated_at = NULL,
		    updated_at = NOW()
		WHERE cache_key = $1
	`, strings.TrimSpace(input.CacheKey),
		strings.TrimSpace(input.OutputPath),
		strings.TrimSpace(input.MimeType),
		input.DurationSeconds,
		strings.TrimSpace(input.VideoCodec),
		strings.TrimSpace(input.AudioCodec),
		input.SubtitleStreamIndex,
		trimStringPtr(input.SubtitleCodec),
	)
	if err != nil {
		return fmt.Errorf("mark theme segment render cache ready %q: %w", input.CacheKey, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AdminContentRepository) MarkThemeSegmentRenderCacheFailed(
	ctx context.Context,
	cacheKey string,
	errorCode string,
	errorMessage string,
) error {
	if strings.TrimSpace(cacheKey) == "" {
		return fmt.Errorf("mark theme segment render cache failed: cache_key is required")
	}
	if strings.TrimSpace(errorCode) == "" && strings.TrimSpace(errorMessage) == "" {
		return fmt.Errorf("mark theme segment render cache failed: error code or message is required")
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE theme_segment_render_cache
		SET status = 'failed',
		    error_code = $2,
		    error_message = $3,
		    completed_at = NOW(),
		    invalidated_at = NULL,
		    updated_at = NOW()
		WHERE cache_key = $1
	`, strings.TrimSpace(cacheKey), strings.TrimSpace(errorCode), strings.TrimSpace(errorMessage))
	if err != nil {
		return fmt.Errorf("mark theme segment render cache failed %q: %w", cacheKey, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AdminContentRepository) MarkThemeSegmentRenderCacheStale(ctx context.Context, cacheKey string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE theme_segment_render_cache
		SET status = 'stale',
		    invalidated_at = NOW(),
		    updated_at = NOW()
		WHERE cache_key = $1
	`, strings.TrimSpace(cacheKey))
	if err != nil {
		return fmt.Errorf("mark theme segment render cache stale %q: %w", cacheKey, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func validateThemeSegmentRenderCacheUpsertInput(input models.ThemeSegmentRenderCacheUpsertInput) error {
	if input.ThemeSegmentID <= 0 {
		return fmt.Errorf("theme segment render cache: theme_segment_id is required")
	}
	if strings.TrimSpace(input.CacheKey) == "" {
		return fmt.Errorf("theme segment render cache: cache_key is required")
	}
	if strings.TrimSpace(input.SourceFingerprint) == "" {
		return fmt.Errorf("theme segment render cache: source_fingerprint is required")
	}
	if strings.TrimSpace(input.RenderProfile) == "" {
		return fmt.Errorf("theme segment render cache: render_profile is required")
	}
	switch strings.TrimSpace(input.SourceKind) {
	case "episode_version", "jellyfin_theme", "uploaded_asset":
		return nil
	default:
		return fmt.Errorf("theme segment render cache: invalid source_kind")
	}
}

func scanThemeSegmentRenderCache(row pgx.Row) (*models.ThemeSegmentRenderCache, error) {
	var item models.ThemeSegmentRenderCache
	var status string
	if err := row.Scan(
		&item.ID,
		&item.ThemeSegmentID,
		&item.PlaybackSourceID,
		&item.CacheKey,
		&item.SourceKind,
		&item.SourceFingerprint,
		&item.RenderProfile,
		&status,
		&item.OutputPath,
		&item.MimeType,
		&item.DurationSeconds,
		&item.VideoCodec,
		&item.AudioCodec,
		&item.SubtitleStreamIndex,
		&item.SubtitleCodec,
		&item.ErrorCode,
		&item.ErrorMessage,
		&item.Attempts,
		&item.QueuedAt,
		&item.StartedAt,
		&item.CompletedAt,
		&item.InvalidatedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("scan theme segment render cache: %w", err)
	}
	item.Status = models.ThemeSegmentRenderStatus(status)
	return &item, nil
}

func trimStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
