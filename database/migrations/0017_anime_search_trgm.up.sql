CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_anime_title_trgm
    ON anime USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_anime_title_de_trgm
    ON anime USING gin (title_de gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_anime_title_en_trgm
    ON anime USING gin (title_en gin_trgm_ops);
