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
