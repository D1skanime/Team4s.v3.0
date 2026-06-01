-- Migration 0087: anime_contribution_roles (CASCADE) und member_badges.

-- Teil 1: Rollenzuordnungen pro Anime-Contribution
CREATE TABLE IF NOT EXISTS anime_contribution_roles (
    id                     BIGSERIAL PRIMARY KEY,
    anime_contribution_id  BIGINT NOT NULL REFERENCES anime_contributions(id) ON DELETE CASCADE,
    role_code              TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE RESTRICT,
    CONSTRAINT uq_anime_contribution_roles_contrib_role UNIQUE (anime_contribution_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_anime_contribution_roles_contrib
    ON anime_contribution_roles(anime_contribution_id);
CREATE INDEX IF NOT EXISTS idx_anime_contribution_roles_code
    ON anime_contribution_roles(role_code);

-- Teil 2: Gespeicherte Badges mit derived_from-Feldern
CREATE TABLE IF NOT EXISTS member_badges (
    id                 BIGSERIAL PRIMARY KEY,
    member_id          BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    badge_code         TEXT NOT NULL,
    badge_category     VARCHAR(30) NOT NULL,
    derived_from_type  TEXT NULL,
    derived_from_id    BIGINT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'active',
    visibility         VARCHAR(20) NOT NULL DEFAULT 'public',
    awarded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_badges_member_code UNIQUE (member_id, badge_code),
    CONSTRAINT chk_member_badges_category CHECK (badge_category IN ('historical_achievement', 'supporter', 'platform')),
    CONSTRAINT chk_member_badges_status CHECK (status IN ('active', 'revoked', 'pending')),
    CONSTRAINT chk_member_badges_visibility CHECK (visibility IN ('public', 'internal', 'hidden'))
);

CREATE INDEX IF NOT EXISTS idx_member_badges_member
    ON member_badges(member_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_category
    ON member_badges(badge_category);
CREATE INDEX IF NOT EXISTS idx_member_badges_visibility
    ON member_badges(visibility);
