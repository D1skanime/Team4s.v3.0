-- Reverts migration 0177 (Vorschaubild pro Kara-Segment).
DROP INDEX IF EXISTS idx_theme_segments_auto_preview_media_asset;
DROP INDEX IF EXISTS idx_theme_segments_preview_media_asset;

ALTER TABLE theme_segments
    DROP COLUMN IF EXISTS auto_preview_media_asset_id,
    DROP COLUMN IF EXISTS preview_media_asset_id;
