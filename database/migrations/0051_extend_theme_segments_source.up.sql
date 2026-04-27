-- Migration 0051: Add explicit source columns to theme_segments
-- source_type, source_ref, source_label replace encoding in source_jellyfin_item_id
-- source_jellyfin_item_id is retained for backwards compatibility

ALTER TABLE theme_segments
    ADD COLUMN IF NOT EXISTS source_type  VARCHAR(20)
        CHECK (source_type IS NULL OR source_type IN ('none', 'jellyfin_theme', 'release_asset')),
    ADD COLUMN IF NOT EXISTS source_ref   TEXT,
    ADD COLUMN IF NOT EXISTS source_label TEXT;
