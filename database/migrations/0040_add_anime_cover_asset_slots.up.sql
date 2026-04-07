ALTER TABLE anime
    ADD COLUMN IF NOT EXISTS cover_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cover_source VARCHAR(16),
    ADD COLUMN IF NOT EXISTS cover_resolved_url TEXT,
    ADD COLUMN IF NOT EXISTS cover_provider_key TEXT;

ALTER TABLE anime
    DROP CONSTRAINT IF EXISTS chk_anime_cover_source;

ALTER TABLE anime
    ADD CONSTRAINT chk_anime_cover_source
    CHECK (cover_source IS NULL OR cover_source IN ('manual', 'provider'));

UPDATE anime
SET
    cover_source = 'manual',
    cover_resolved_url = cover_image,
    cover_provider_key = NULL
WHERE (cover_source IS NULL OR btrim(cover_source) = '')
  AND cover_asset_id IS NULL
  AND cover_resolved_url IS NULL
  AND cover_image IS NOT NULL
  AND btrim(cover_image) <> '';
