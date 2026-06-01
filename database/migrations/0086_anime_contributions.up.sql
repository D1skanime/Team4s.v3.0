-- Migration 0086: anime_contributions — historisches Faktenregister für Anime-Beteiligung.
-- fansub_group_member_id ist NOT NULL: Jede Contribution hängt an einer konkreten Gruppenmitgliedschaft.

CREATE TABLE IF NOT EXISTS anime_contributions (
    id                         BIGSERIAL PRIMARY KEY,
    fansub_group_id            BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    anime_id                   BIGINT NOT NULL REFERENCES anime(id) ON DELETE RESTRICT,
    fansub_group_member_id     BIGINT NOT NULL REFERENCES hist_fansub_group_members(id) ON DELETE RESTRICT,
    status                     VARCHAR(20) NOT NULL DEFAULT 'draft',
    note                       TEXT NULL,
    started_year               INT NULL,
    ended_year                 INT NULL,
    is_public_on_anime_page    BOOLEAN NOT NULL DEFAULT false,
    is_public_on_member_profile BOOLEAN NOT NULL DEFAULT false,
    confirmed_by               BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    confirmed_at               TIMESTAMPTZ NULL,
    created_by                 BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by                 BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_anime_contributions_status CHECK (status IN ('draft', 'proposed', 'confirmed', 'disputed', 'hidden')),
    CONSTRAINT chk_anime_contributions_years CHECK (ended_year IS NULL OR started_year IS NULL OR ended_year >= started_year)
);

CREATE INDEX IF NOT EXISTS idx_anime_contributions_group
    ON anime_contributions(fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_anime_contributions_anime
    ON anime_contributions(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_contributions_member
    ON anime_contributions(fansub_group_member_id);
CREATE INDEX IF NOT EXISTS idx_anime_contributions_status
    ON anime_contributions(status);
CREATE INDEX IF NOT EXISTS idx_anime_contributions_public_anime
    ON anime_contributions(is_public_on_anime_page) WHERE is_public_on_anime_page = true;
CREATE INDEX IF NOT EXISTS idx_anime_contributions_public_profile
    ON anime_contributions(is_public_on_member_profile) WHERE is_public_on_member_profile = true;
