-- Migration 0168: Mehrsprachige Anzeigenamen für Tags und Genres.
-- Fügt je eine Tabelle "Tag + Sprache + Name" (tag_names) und
-- "Genre + Sprache + Name" (genre_names) über die bestehende languages-Tabelle
-- hinzu, nach dem Muster von anime_titles (Migration 0021) — aber ohne ein
-- title_type_id-Äquivalent, da ein Tag/Genre genau einen Namen je Sprache hat.
-- Rein additiv: tags.name/genres.name bleiben unverändert der eindeutige
-- Grundname, bestehende Tag-/Genre-Zeilen werden nicht verändert oder
-- automatisch einer Sprache zugeordnet.
CREATE TABLE IF NOT EXISTS tag_names (
    id BIGSERIAL PRIMARY KEY,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tag_name_language UNIQUE (tag_id, language_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_names_tag ON tag_names(tag_id);

CREATE TABLE IF NOT EXISTS genre_names (
    id BIGSERIAL PRIMARY KEY,
    genre_id BIGINT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_genre_name_language UNIQUE (genre_id, language_id)
);

CREATE INDEX IF NOT EXISTS idx_genre_names_genre ON genre_names(genre_id);
