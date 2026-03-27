DROP TABLE IF EXISTS anime_background_assets;

ALTER TABLE anime
    DROP CONSTRAINT IF EXISTS chk_anime_banner_source;

ALTER TABLE anime
    DROP COLUMN IF EXISTS banner_provider_key,
    DROP COLUMN IF EXISTS banner_resolved_url,
    DROP COLUMN IF EXISTS banner_source,
    DROP COLUMN IF EXISTS banner_asset_id;
