CREATE TABLE IF NOT EXISTS episode_version_images (
    id BIGSERIAL PRIMARY KEY,
    episode_version_id BIGINT NOT NULL REFERENCES episode_versions (id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    caption TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_episode_version_images_dimensions
        CHECK ((width IS NULL AND height IS NULL) OR (width > 0 AND height > 0))
);

CREATE INDEX IF NOT EXISTS idx_episode_version_images_version_id
    ON episode_version_images (episode_version_id, display_order);
