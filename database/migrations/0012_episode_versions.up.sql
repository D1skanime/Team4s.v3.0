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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_episode_versions_episode_number
        CHECK (episode_number > 0),
    CONSTRAINT chk_episode_versions_subtitle_type
        CHECK (subtitle_type IS NULL OR subtitle_type IN ('hardsub', 'softsub')),
    CONSTRAINT uq_episode_versions_identity
        UNIQUE (anime_id, episode_number, fansub_group_id, video_quality, subtitle_type)
);

CREATE INDEX IF NOT EXISTS idx_episode_versions_anime_episode
    ON episode_versions (anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_episode_versions_fansub_group_id
    ON episode_versions (fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_episode_versions_release_date
    ON episode_versions (release_date);
