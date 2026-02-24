CREATE TABLE fansub_group_aliases (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    alias VARCHAR(120) NOT NULL,
    normalized_alias VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fansub_group_aliases_normalized_alias UNIQUE (normalized_alias),
    CONSTRAINT uq_fansub_group_aliases_group_normalized UNIQUE (fansub_group_id, normalized_alias)
);

CREATE INDEX idx_fansub_group_aliases_group_id
    ON fansub_group_aliases (fansub_group_id);

