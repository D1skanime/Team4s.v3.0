-- Phase 5 Package 2 Task 4: Junction Tables Migration
-- Creates many-to-many junction tables for anime metadata relationships
-- Shadow mode: release_roles table uses logical release_id only (no FK until Phase 6)

-- Anime studios - links anime to production studios with role information
CREATE TABLE IF NOT EXISTS anime_studios (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    studio_id BIGINT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- e.g., 'main', 'co-producer', 'subsidiary'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, studio_id, role)
);

CREATE INDEX IF NOT EXISTS idx_anime_studio_anime ON anime_studios(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_studio_studio ON anime_studios(studio_id);

-- Anime persons - links anime to directors, writers, composers, etc.
CREATE TABLE IF NOT EXISTS anime_persons (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role_type VARCHAR(100) NOT NULL,  -- e.g., 'director', 'writer', 'composer', 'voice actor'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, person_id, role_type)
);

CREATE INDEX IF NOT EXISTS idx_anime_person_anime ON anime_persons(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_person_person ON anime_persons(person_id);

-- Anime genres - links anime to genre categories
CREATE TABLE IF NOT EXISTS anime_genres (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    genre_id BIGINT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_genre_anime ON anime_genres(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_genre_genre ON anime_genres(genre_id);

-- Release roles - links episode releases to fansub contributors
-- NOTE: Shadow mode - release_id is BIGINT with no FK constraint (deferred to Phase 6)
-- This table is prepared for future episode_versions refactoring
CREATE TABLE IF NOT EXISTS release_roles (
    release_id BIGINT NOT NULL,  -- Logical reference to future releases table
    person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_id, person_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_release_role_release ON release_roles(release_id);
CREATE INDEX IF NOT EXISTS idx_release_role_person ON release_roles(person_id);
CREATE INDEX IF NOT EXISTS idx_release_role_role ON release_roles(role_id);

COMMENT ON TABLE release_roles IS 'Shadow mode: release_id is logical only, FK constraint deferred to Phase 6 episode_versions refactoring';
