-- Migration 0122: Technical render cache for prepared OP/ED/Kara segment clips.
-- This is derived media infrastructure, not user-managed media_assets/release_media/episode_media.

CREATE TABLE IF NOT EXISTS theme_segment_render_cache (
    id BIGSERIAL PRIMARY KEY,
    theme_segment_id BIGINT NOT NULL REFERENCES theme_segments(id) ON DELETE CASCADE,
    playback_source_id BIGINT REFERENCES theme_segment_playback_sources(id) ON DELETE SET NULL,
    cache_key TEXT NOT NULL,
    source_kind VARCHAR(32) NOT NULL
        CHECK (source_kind IN ('episode_version', 'jellyfin_theme', 'uploaded_asset')),
    source_fingerprint TEXT NOT NULL,
    render_profile TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'rendering', 'ready', 'failed', 'stale')),
    output_path TEXT,
    mime_type TEXT,
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
    video_codec TEXT,
    audio_codec TEXT,
    subtitle_stream_index INTEGER CHECK (subtitle_stream_index IS NULL OR subtitle_stream_index >= 0),
    subtitle_codec TEXT,
    error_code TEXT,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_theme_segment_render_ready_payload
        CHECK (
            status <> 'ready'
            OR (
                NULLIF(BTRIM(output_path), '') IS NOT NULL
                AND NULLIF(BTRIM(mime_type), '') IS NOT NULL
                AND duration_seconds IS NOT NULL
                AND NULLIF(BTRIM(video_codec), '') IS NOT NULL
                AND NULLIF(BTRIM(audio_codec), '') IS NOT NULL
                AND completed_at IS NOT NULL
            )
        ),
    CONSTRAINT chk_theme_segment_render_failed_payload
        CHECK (
            status <> 'failed'
            OR (
                NULLIF(BTRIM(error_code), '') IS NOT NULL
                OR NULLIF(BTRIM(error_message), '') IS NOT NULL
            )
        ),
    CONSTRAINT chk_theme_segment_render_stale_payload
        CHECK (
            status <> 'stale'
            OR invalidated_at IS NOT NULL
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_theme_segment_render_cache_key
    ON theme_segment_render_cache (cache_key);

CREATE INDEX IF NOT EXISTS idx_theme_segment_render_cache_segment
    ON theme_segment_render_cache (theme_segment_id);

CREATE INDEX IF NOT EXISTS idx_theme_segment_render_cache_source
    ON theme_segment_render_cache (playback_source_id);

CREATE INDEX IF NOT EXISTS idx_theme_segment_render_cache_status
    ON theme_segment_render_cache (status, queued_at);

CREATE INDEX IF NOT EXISTS idx_theme_segment_render_cache_active_segment
    ON theme_segment_render_cache (theme_segment_id, status)
    WHERE status IN ('queued', 'rendering', 'ready');
