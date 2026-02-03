-- Migration: 002_create_anime
-- Zweck: Anime-Stammdaten (ersetzt anmi1_anime)

CREATE TYPE anime_status AS ENUM ('disabled', 'ongoing', 'done', 'aborted', 'licensed');
CREATE TYPE anime_type AS ENUM ('tv', 'ova', 'film', 'bonus', 'special', 'ona', 'music');
CREATE TYPE content_type AS ENUM ('anime', 'hentai');

CREATE TABLE IF NOT EXISTS anime (
    id BIGSERIAL PRIMARY KEY,

    -- Externe Referenzen
    anisearch_id VARCHAR(255) UNIQUE,

    -- Basis-Daten
    title VARCHAR(255) NOT NULL,
    type anime_type NOT NULL DEFAULT 'tv',
    content_type content_type NOT NULL DEFAULT 'anime',
    status anime_status NOT NULL DEFAULT 'disabled',

    -- Details
    year SMALLINT,
    max_episodes SMALLINT NOT NULL DEFAULT 0,
    genre VARCHAR(255),
    source VARCHAR(255),
    description TEXT,

    -- Cover/Media
    cover_image VARCHAR(255),
    folder_name VARCHAR(255),

    -- Fansub-Kommentare
    sub_comment VARCHAR(255),
    stream_comment VARCHAR(255),
    is_self_subbed BOOLEAN NOT NULL DEFAULT false,

    -- Statistiken
    view_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Legacy-Referenz
    legacy_anime_id INTEGER
);

-- Anime-Relationen (Sequel/Prequel/Spinoff) - ersetzt "verwandt"
CREATE TABLE IF NOT EXISTS anime_relations (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    related_anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    relation_type VARCHAR(32) NOT NULL DEFAULT 'related',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Keine Duplikate
    CONSTRAINT unique_relation UNIQUE (anime_id, related_anime_id),
    -- Keine Selbst-Referenz
    CONSTRAINT no_self_relation CHECK (anime_id <> related_anime_id)
);

-- Indizes
CREATE INDEX idx_anime_title ON anime(title);
CREATE INDEX idx_anime_status ON anime(status);
CREATE INDEX idx_anime_type ON anime(type);
CREATE INDEX idx_anime_content_type ON anime(content_type);
CREATE INDEX idx_anime_year ON anime(year);
CREATE INDEX idx_anime_legacy_id ON anime(legacy_anime_id);
CREATE INDEX idx_anime_relations_anime ON anime_relations(anime_id);
CREATE INDEX idx_anime_relations_related ON anime_relations(related_anime_id);

-- Trigger fuer updated_at
CREATE TRIGGER update_anime_updated_at
    BEFORE UPDATE ON anime
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
