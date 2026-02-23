CREATE TABLE IF NOT EXISTS fansub_groups (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    history TEXT,
    logo_url TEXT,
    banner_url TEXT,
    founded_year INTEGER,
    dissolved_year INTEGER,
    status VARCHAR(20) NOT NULL,
    website_url TEXT,
    discord_url TEXT,
    irc_url TEXT,
    country VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fansub_groups_status
        CHECK (status IN ('active', 'inactive', 'dissolved')),
    CONSTRAINT chk_fansub_groups_years
        CHECK (
            dissolved_year IS NULL
            OR founded_year IS NULL
            OR dissolved_year >= founded_year
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fansub_groups_slug
    ON fansub_groups (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fansub_groups_name
    ON fansub_groups (name);
CREATE INDEX IF NOT EXISTS idx_fansub_groups_status
    ON fansub_groups (status);
