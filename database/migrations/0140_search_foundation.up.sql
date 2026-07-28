-- Phase 115 Plan 02: Suchfundament (globale Suche, PostgreSQL FTS + Trigram)
-- Aktiviert die unaccent-Extension, legt einen IMMUTABLE-Wrapper (f_unaccent) an,
-- baut funktionale GIN-Trigram-Indizes ueber f_unaccent(<col>) auf allen fuenf
-- Suchspalten, funktionale Normalisierungs-Indizes fuer die Bindestrich-/
-- Punktuations-invariante Gleichheit auf fansub_groups.name/slug (D-04, passend zu
-- normalizeAliasKey / Plan 115-03) und gewichtete, generierte tsvector-Spalten fuer
-- das D-05-Ranking auf anime + fansub_groups.
--
-- Der Migrate-Runner (backend/internal/migrations/runner.go) fuehrt jede Datei bereits
-- in einer eigenen Transaktion aus -> kein explizites BEGIN/COMMIT (analog 0017).

-- (1) Extension: Akzent-/Sonderzeichen-Normalisierung (D-01/D-04). PG16-Bordmittel (contrib).
CREATE EXTENSION IF NOT EXISTS unaccent;

-- (2) IMMUTABLE-Wrapper: unaccent() ist per Default NICHT IMMUTABLE (haengt am
-- Dictionary-Zustand) und darf so nicht in funktionalen Indizes / generierten Spalten
-- stehen. Mit explizit benanntem 'unaccent'-Dictionary ist das Ergebnis deterministisch
-- und darf als IMMUTABLE deklariert werden (PostgreSQL-Standardrezept, RESEARCH Pitfall 2).
CREATE OR REPLACE FUNCTION f_unaccent(text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    STRICT
AS $$
    SELECT unaccent('unaccent', $1)
$$;

-- (3) Funktionale GIN-Trigram-Indizes ueber f_unaccent(<col>) (NICHT die Rohspalte!),
-- sonst faellt akzentnormalisierte Suche auf Seq Scan zurueck (Pitfall 2, D-09).
-- Fuenf Suchspalten: anime.title, anime_titles.title, fansub_groups.name/slug,
-- fansub_group_aliases.normalized_alias. (Die 0017-Rohspalten-Indizes bleiben
-- unangetastet - Brownfield.)
CREATE INDEX IF NOT EXISTS idx_anime_title_unaccent_trgm
    ON anime USING gin (f_unaccent(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_anime_titles_title_unaccent_trgm
    ON anime_titles USING gin (f_unaccent(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fansub_groups_name_unaccent_trgm
    ON fansub_groups USING gin (f_unaccent(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fansub_groups_slug_unaccent_trgm
    ON fansub_groups USING gin (f_unaccent(slug) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fansub_group_aliases_normalized_unaccent_trgm
    ON fansub_group_aliases USING gin (f_unaccent(normalized_alias) gin_trgm_ops);

-- (4) Funktionale btree-Normalisierungs-Indizes fuer die Bindestrich-/Leerzeichen-/
-- Punktuations-invariante Gleichheit/Praefix (D-04). Der SQL-Ausdruck ist BYTE-IDENTISCH
-- zur query-seitigen normalizeAliasKey-Normalisierung, die Plan 115-03 nutzt
-- (fansub_repository.go:1557-1566: lowercase + nur [a-z0-9]). f_unaccent entfernt zuvor
-- Akzente. Alle drei Funktionen (regexp_replace/lower/f_unaccent) sind IMMUTABLE -> Index zulaessig.
-- fansub_group_aliases.normalized_alias besitzt bereits einen UNIQUE-Index -> Gleichheit
-- dort ist schon indexgestuetzt; kein zusaetzlicher Gleichheits-Index noetig.
CREATE INDEX IF NOT EXISTS idx_fansub_groups_name_norm
    ON fansub_groups (regexp_replace(lower(f_unaccent(name)), '[^a-z0-9]+', '', 'g'));

CREATE INDEX IF NOT EXISTS idx_fansub_groups_slug_norm
    ON fansub_groups (regexp_replace(lower(f_unaccent(slug)), '[^a-z0-9]+', '', 'g'));

-- (5) Generierte, gewichtete tsvector-Spalten pro Entitaet (Open Question 3 = generierte
-- Spalte + GIN, NICHT Ad-hoc to_tsvector() pro Query -> sonst keine Index-Nutzung, D-09).
-- Gewichtung gemaess D-05-Rangfolge: Haupttitel/Name = 'A', alternative Titel/Slug = 'B'.
-- to_tsvector('simple', ...) mit konstantem Config-Argument + setweight + f_unaccent sind
-- IMMUTABLE -> in GENERATED ALWAYS AS (...) STORED zulaessig.
ALTER TABLE anime
    ADD COLUMN IF NOT EXISTS search_tsv tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(f_unaccent(title), '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(f_unaccent(title_de), '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(f_unaccent(title_en), '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_anime_search_tsv
    ON anime USING gin (search_tsv);

ALTER TABLE fansub_groups
    ADD COLUMN IF NOT EXISTS search_tsv tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(f_unaccent(name), '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(f_unaccent(slug), '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_fansub_groups_search_tsv
    ON fansub_groups USING gin (search_tsv);
