ALTER TABLE anime
    DROP CONSTRAINT IF EXISTS chk_anime_cover_source;

ALTER TABLE anime
    DROP COLUMN IF EXISTS cover_provider_key,
    DROP COLUMN IF EXISTS cover_resolved_url,
    DROP COLUMN IF EXISTS cover_source,
    DROP COLUMN IF EXISTS cover_asset_id;
