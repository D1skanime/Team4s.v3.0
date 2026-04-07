ALTER TABLE anime
    ADD COLUMN IF NOT EXISTS banner_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS banner_source VARCHAR(16),
    ADD COLUMN IF NOT EXISTS banner_resolved_url TEXT,
    ADD COLUMN IF NOT EXISTS banner_provider_key TEXT;

ALTER TABLE anime
    DROP CONSTRAINT IF EXISTS chk_anime_banner_source;

ALTER TABLE anime
    ADD CONSTRAINT chk_anime_banner_source
    CHECK (banner_source IS NULL OR banner_source IN ('manual', 'provider'));

CREATE TABLE IF NOT EXISTS anime_background_assets (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    media_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    source VARCHAR(16) NOT NULL,
    resolved_url TEXT,
    provider_key TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_anime_background_source CHECK (source IN ('manual', 'provider'))
);

CREATE INDEX IF NOT EXISTS idx_anime_background_assets_anime_sort
    ON anime_background_assets (anime_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_anime_background_assets_media
    ON anime_background_assets (media_asset_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_anime_background_assets_provider
    ON anime_background_assets (anime_id, provider_key)
    WHERE provider_key IS NOT NULL;
