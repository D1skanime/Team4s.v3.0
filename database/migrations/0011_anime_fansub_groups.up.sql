CREATE TABLE IF NOT EXISTS anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime (id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups (id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, fansub_group_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_fansub_groups_group_id
    ON anime_fansub_groups (fansub_group_id);
