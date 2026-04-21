-- Recreate the legacy episode-version tables for rollback shape only.
-- Rows dropped by the up migration are intentionally not recoverable here.

CREATE TABLE IF NOT EXISTS episode_versions (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime (id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title VARCHAR(255),
    fansub_group_id BIGINT REFERENCES fansub_groups (id) ON DELETE SET NULL,
    media_provider VARCHAR(30) NOT NULL,
    media_item_id VARCHAR(120) NOT NULL,
    video_quality VARCHAR(20),
    subtitle_type VARCHAR(20),
    release_date TIMESTAMPTZ,
    stream_url TEXT,
    fansub_release_id BIGINT REFERENCES fansub_releases(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_episode_versions_episode_number
        CHECK (episode_number > 0),
    CONSTRAINT chk_episode_versions_subtitle_type
        CHECK (subtitle_type IS NULL OR subtitle_type IN ('hardsub', 'softsub')),
    CONSTRAINT uq_episode_versions_identity
        UNIQUE (anime_id, episode_number, fansub_group_id, video_quality, subtitle_type)
);

COMMENT ON COLUMN episode_versions.fansub_release_id IS 'Reference to migrated fansub_release (transition period)';

CREATE INDEX IF NOT EXISTS idx_episode_versions_anime_episode
    ON episode_versions (anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_episode_versions_fansub_group_id
    ON episode_versions (fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_episode_versions_release_date
    ON episode_versions (release_date);

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

CREATE TABLE IF NOT EXISTS episode_version_episodes (
    episode_version_id BIGINT NOT NULL REFERENCES episode_versions(id) ON DELETE CASCADE,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    coverage_order SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (episode_version_id, episode_id),
    CONSTRAINT chk_episode_version_episodes_order CHECK (coverage_order > 0)
);

CREATE INDEX IF NOT EXISTS idx_episode_version_episodes_episode
    ON episode_version_episodes (episode_id, coverage_order, episode_version_id);
