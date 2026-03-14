-- Phase 5 Package 2: Phase A Reference Metadata Migration
-- Canonical scope from docs/architecture/db-schema-v2.md:
-- genres only in this migration; contributor/member entities are out of scope

-- Genres table - normalized anime genres
CREATE TABLE IF NOT EXISTS genres (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_genre_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_genre_name ON genres(name);
