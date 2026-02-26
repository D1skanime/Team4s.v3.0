CREATE TABLE IF NOT EXISTS media_assets (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_filename_unique
    ON media_assets (filename);

ALTER TABLE fansub_groups
    ADD COLUMN IF NOT EXISTS logo_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS banner_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fansub_groups_logo_id
    ON fansub_groups (logo_id);

CREATE INDEX IF NOT EXISTS idx_fansub_groups_banner_id
    ON fansub_groups (banner_id);
