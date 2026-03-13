-- Phase 5 Package 2 Task 3: Normalized Metadata Tables Migration
-- Creates anime_titles and anime_relations for normalized metadata storage
-- Shadow mode: Dual-read pattern - legacy flat columns remain unchanged

-- Anime titles - normalized storage for multi-language, multi-variant titles
CREATE TABLE IF NOT EXISTS anime_titles (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    title TEXT NOT NULL,
    title_type_id BIGINT NOT NULL REFERENCES title_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_anime_title UNIQUE (anime_id, language_id, title_type_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_title_anime ON anime_titles(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_title_language ON anime_titles(language_id);
CREATE INDEX IF NOT EXISTS idx_anime_title_type ON anime_titles(title_type_id);

-- Anime relations - normalized storage for anime-to-anime relationships
CREATE TABLE IF NOT EXISTS anime_relations (
    source_anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    target_anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    relation_type_id BIGINT NOT NULL REFERENCES relation_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_anime_id, target_anime_id, relation_type_id),
    CONSTRAINT chk_no_self_relation CHECK (source_anime_id != target_anime_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_relation_source ON anime_relations(source_anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_relation_target ON anime_relations(target_anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_relation_type ON anime_relations(relation_type_id);
