-- Migration 0024 down: Restore legacy media_assets schema
DROP TABLE IF EXISTS media_assets CASCADE;

-- Recreate legacy schema
CREATE TABLE media_assets (
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

CREATE UNIQUE INDEX idx_media_assets_filename_unique ON media_assets(filename);

-- Note: fansub_groups FK constraints would need to be restored manually if data existed
