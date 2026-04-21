-- Migration 0044: Add missing DB Schema v2 target tables and lookup values.
-- This is additive only; legacy episode_version tables remain for the later cleanup plan.

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS episode_filler_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    is_filler BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_episode_filler_type_name UNIQUE (name)
);

INSERT INTO episode_filler_types (name, is_filler) VALUES
    ('unknown', false),
    ('canon', false),
    ('filler', true),
    ('mixed', true),
    ('recap', true)
ON CONFLICT (name) DO UPDATE
SET is_filler = EXCLUDED.is_filler;

CREATE TABLE IF NOT EXISTS release_variant_episodes (
    release_variant_id BIGINT NOT NULL REFERENCES release_variants(id) ON DELETE CASCADE,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    position SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_variant_id, episode_id),
    CONSTRAINT chk_release_variant_episodes_position CHECK (position > 0)
);

CREATE INDEX IF NOT EXISTS idx_release_variant_episode_variant
    ON release_variant_episodes(release_variant_id);
CREATE INDEX IF NOT EXISTS idx_release_variant_episode_episode
    ON release_variant_episodes(episode_id);
CREATE INDEX IF NOT EXISTS idx_release_variant_episode_position
    ON release_variant_episodes(release_variant_id, position);

CREATE TABLE IF NOT EXISTS theme_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_theme_type_name UNIQUE (name)
);

INSERT INTO theme_types (name) VALUES
    ('opening'),
    ('ending'),
    ('insert_song')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS themes (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    theme_type_id BIGINT NOT NULL REFERENCES theme_types(id),
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_theme_anime ON themes(anime_id);
CREATE INDEX IF NOT EXISTS idx_theme_type ON themes(theme_type_id);

CREATE TABLE IF NOT EXISTS release_theme_assets (
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE,
    theme_id BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_id, theme_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_release_theme_asset_release
    ON release_theme_assets(release_id);
CREATE INDEX IF NOT EXISTS idx_release_theme_asset_theme
    ON release_theme_assets(theme_id);
CREATE INDEX IF NOT EXISTS idx_release_theme_asset_media
    ON release_theme_assets(media_id);

CREATE TABLE IF NOT EXISTS theme_segments (
    id BIGSERIAL PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
    start_episode_id BIGINT REFERENCES episodes(id) ON DELETE SET NULL,
    end_episode_id BIGINT REFERENCES episodes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_theme_segment_theme ON theme_segments(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_segment_start ON theme_segments(start_episode_id);
CREATE INDEX IF NOT EXISTS idx_theme_segment_end ON theme_segments(end_episode_id);

CREATE TABLE IF NOT EXISTS episode_theme_overrides (
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    theme_id BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_id, episode_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_episode_theme_override_release
    ON episode_theme_overrides(release_id);
CREATE INDEX IF NOT EXISTS idx_episode_theme_override_episode
    ON episode_theme_overrides(episode_id);

CREATE TABLE IF NOT EXISTS fansub_group_links (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    link_type VARCHAR(40) NOT NULL,
    name VARCHAR(120),
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fansub_group_link UNIQUE (group_id, link_type, url),
    CONSTRAINT chk_fansub_group_link_type
        CHECK (link_type IN ('website', 'discord', 'twitter', 'github', 'irc'))
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_link_group
    ON fansub_group_links(group_id);
CREATE INDEX IF NOT EXISTS idx_fansub_group_link_type
    ON fansub_group_links(link_type);

CREATE TABLE IF NOT EXISTS members (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    nickname VARCHAR(120) NOT NULL,
    member_history_description TEXT,
    slogan TEXT,
    avatar_media_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_member_avatar ON members(avatar_media_id);

CREATE TABLE IF NOT EXISTS group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    joined_year INTEGER,
    left_year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_group_member_joined UNIQUE (group_id, member_id, joined_year),
    CONSTRAINT chk_group_members_years
        CHECK (left_year IS NULL OR joined_year IS NULL OR left_year >= joined_year)
);

CREATE INDEX IF NOT EXISTS idx_group_member_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_member_member ON group_members(member_id);

CREATE TABLE IF NOT EXISTS contributor_roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contributor_role_name UNIQUE (name)
);

INSERT INTO contributor_roles (name) VALUES
    ('Translator'),
    ('Timer'),
    ('Typesetter'),
    ('Encoder'),
    ('QC'),
    ('Karaoke')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS release_member_roles (
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES contributor_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_id, member_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_release_member_role_release
    ON release_member_roles(release_id);
CREATE INDEX IF NOT EXISTS idx_release_member_role_member
    ON release_member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_release_member_role_role
    ON release_member_roles(role_id);

CREATE TABLE IF NOT EXISTS member_anime_notes (
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (member_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_member_anime_note_member
    ON member_anime_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_member_anime_note_anime
    ON member_anime_notes(anime_id);

CREATE TABLE IF NOT EXISTS member_episode_notes (
    id BIGSERIAL PRIMARY KEY,
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES contributor_roles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_member_episode_note_release_member_role UNIQUE (release_id, member_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_member_episode_note_release
    ON member_episode_notes(release_id);
CREATE INDEX IF NOT EXISTS idx_member_episode_note_member
    ON member_episode_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_member_episode_note_role
    ON member_episode_notes(role_id);
