CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_tag_name ON tags (name);

CREATE TABLE IF NOT EXISTS anime_tags (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_tags_anime_id ON anime_tags (anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_tags_tag_id ON anime_tags (tag_id);
