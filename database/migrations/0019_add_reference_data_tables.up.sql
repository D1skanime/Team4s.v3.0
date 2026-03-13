-- Phase 5 Package 2: Reference Data Tables Migration
-- Creates normalized reference tables: studios, persons, contributor_roles, genres
-- Shadow mode: These tables do not have FK enforcement to existing schema yet

-- Studios table - anime production studios
CREATE TABLE IF NOT EXISTS studios (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    founded_year INTEGER,
    closed_year INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_by BIGINT,  -- User ID for audit, no FK (users table managed externally)
    CONSTRAINT uq_studio_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_studio_name ON studios(name);

-- Persons table - directors, writers, voice actors, etc.
CREATE TABLE IF NOT EXISTS persons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_native VARCHAR(255),  -- Native script name (e.g., Japanese)
    birth_year INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_by BIGINT,  -- User ID for audit, no FK (users table managed externally)
    CONSTRAINT uq_person_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_person_name ON persons(name);

-- Contributor Roles table - fansub contributor roles
-- NOTE: This is distinct from the 'roles' table (migration 0013) which handles authorization roles
CREATE TABLE IF NOT EXISTS contributor_roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contributor_role_name UNIQUE (name)
);

-- Seed standard contributor roles
INSERT INTO contributor_roles (name) VALUES
    ('translator'),
    ('timer'),
    ('typesetter'),
    ('encoder'),
    ('qc'),
    ('karaoke')
ON CONFLICT (name) DO NOTHING;

-- Genres table - anime genres
CREATE TABLE IF NOT EXISTS genres (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_genre_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_genre_name ON genres(name);
