DROP INDEX IF EXISTS idx_fansub_groups_banner_id;
DROP INDEX IF EXISTS idx_fansub_groups_logo_id;
DROP INDEX IF EXISTS idx_media_assets_filename_unique;

ALTER TABLE fansub_groups
    DROP COLUMN IF EXISTS banner_id,
    DROP COLUMN IF EXISTS logo_id;

DROP TABLE IF EXISTS media_assets;
