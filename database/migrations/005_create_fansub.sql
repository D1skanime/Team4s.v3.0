-- Migration: 005_create_fansub
-- Zweck: Fansub-Workflow (Attendants/Rollen-Zuordnung)

-- Attendants / Rollen-Zuordnung (ersetzt anmi1_attendants)
CREATE TYPE fansub_role AS ENUM (
    'raw', 'translate', 'time', 'typeset', 'logo',
    'edit', 'karatime', 'karafx', 'qc', 'encode'
);

CREATE TABLE IF NOT EXISTS attendants (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Kann entweder auf Anime- oder Episode-Ebene sein
    anime_id BIGINT REFERENCES anime(id) ON DELETE CASCADE,
    episode_id BIGINT REFERENCES episodes(id) ON DELETE CASCADE,

    -- Rolle
    role fansub_role NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Mindestens anime_id oder episode_id muss gesetzt sein
    CONSTRAINT attendant_has_target CHECK (
        anime_id IS NOT NULL OR episode_id IS NOT NULL
    )
);

-- Fansub-Gruppen (optional, fuer Partner-Gruppen)
CREATE TABLE IF NOT EXISTS fansub_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    logo_url VARCHAR(512),
    website_url VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anime-Gruppen-Zuordnung
CREATE TABLE IF NOT EXISTS anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, group_id)
);

-- Indizes
CREATE INDEX idx_attendants_user ON attendants(user_id);
CREATE INDEX idx_attendants_anime ON attendants(anime_id);
CREATE INDEX idx_attendants_episode ON attendants(episode_id);
CREATE INDEX idx_attendants_role ON attendants(role);
CREATE INDEX idx_anime_fansub_groups_anime ON anime_fansub_groups(anime_id);
CREATE INDEX idx_anime_fansub_groups_group ON anime_fansub_groups(group_id);

-- Trigger fuer updated_at
CREATE TRIGGER update_fansub_groups_updated_at
    BEFORE UPDATE ON fansub_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
