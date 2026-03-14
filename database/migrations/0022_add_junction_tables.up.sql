-- Phase 5 Package 2 Task 4: Phase A Junction Tables Migration
-- Canonical scope from docs/architecture/db-schema-v2.md:
-- anime_genres only in this migration

-- Anime genres - links anime to normalized genre categories
CREATE TABLE IF NOT EXISTS anime_genres (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    genre_id BIGINT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_genre_anime ON anime_genres(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_genre_genre ON anime_genres(genre_id);
