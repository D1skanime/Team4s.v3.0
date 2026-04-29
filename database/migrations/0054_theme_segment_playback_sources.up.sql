-- Migration 0054: Add explicit playback source linkage for theme segments.
-- This separates playback provenance from theme_segments.source_* so segments
-- can evolve toward stream-based playback without overloading legacy fields.

CREATE TABLE IF NOT EXISTS theme_segment_playback_sources (
    id BIGSERIAL PRIMARY KEY,
    theme_segment_id BIGINT NOT NULL REFERENCES theme_segments(id) ON DELETE CASCADE,
    source_kind VARCHAR(32) NOT NULL
        CHECK (source_kind IN ('episode_version', 'jellyfin_theme', 'uploaded_asset')),
    release_variant_id BIGINT REFERENCES release_variants(id) ON DELETE SET NULL,
    jellyfin_item_id TEXT,
    media_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    source_label TEXT,
    start_offset_seconds INTEGER CHECK (start_offset_seconds IS NULL OR start_offset_seconds >= 0),
    end_offset_seconds INTEGER CHECK (end_offset_seconds IS NULL OR end_offset_seconds >= 0),
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_theme_segment_playback_target
        CHECK (
            (
                (CASE WHEN release_variant_id IS NULL THEN 0 ELSE 1 END) +
                (CASE WHEN NULLIF(BTRIM(jellyfin_item_id), '') IS NULL THEN 0 ELSE 1 END) +
                (CASE WHEN media_asset_id IS NULL THEN 0 ELSE 1 END)
            ) = 1
        ),
    CONSTRAINT chk_theme_segment_playback_offsets
        CHECK (
            start_offset_seconds IS NULL OR
            end_offset_seconds IS NULL OR
            end_offset_seconds > start_offset_seconds
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_theme_segment_playback_sources_segment
    ON theme_segment_playback_sources (theme_segment_id);

CREATE INDEX IF NOT EXISTS idx_theme_segment_playback_sources_variant
    ON theme_segment_playback_sources (release_variant_id);

CREATE INDEX IF NOT EXISTS idx_theme_segment_playback_sources_media
    ON theme_segment_playback_sources (media_asset_id);

CREATE INDEX IF NOT EXISTS idx_theme_segment_playback_sources_jellyfin
    ON theme_segment_playback_sources (jellyfin_item_id)
    WHERE NULLIF(BTRIM(jellyfin_item_id), '') IS NOT NULL;
