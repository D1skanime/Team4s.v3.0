CREATE TABLE IF NOT EXISTS fansub_members (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups (id) ON DELETE CASCADE,
    handle VARCHAR(120) NOT NULL,
    role VARCHAR(60) NOT NULL,
    since_year INTEGER,
    until_year INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fansub_members_years
        CHECK (
            until_year IS NULL
            OR since_year IS NULL
            OR until_year >= since_year
        )
);

CREATE INDEX IF NOT EXISTS idx_fansub_members_group_id
    ON fansub_members (fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_fansub_members_role
    ON fansub_members (role);
