-- Phase 115 Plan 02: Rollback des Suchfundaments (spiegelbildlich zu 0140 up).
-- Reihenfolge: zuerst die Objekte, die von f_unaccent abhaengen (generierte Spalten +
-- funktionale Indizes), danach die Wrapper-Funktion. Die unaccent-Extension wird
-- BEWUSST NICHT gedroppt (koennte spaeter geteilt werden; ein uebrig gebliebenes
-- IF-NOT-EXISTS-Extension ist harmlos und idempotent re-anlegbar).
--
-- Kein explizites BEGIN/COMMIT: der Migrate-Runner wrappt jede Datei bereits in eine
-- eigene Transaktion (analog up-Migration).

-- (5) Generierte tsvector-Spalten + ihre GIN-Indizes.
DROP INDEX IF EXISTS idx_fansub_groups_search_tsv;
DROP INDEX IF EXISTS idx_anime_search_tsv;
ALTER TABLE fansub_groups DROP COLUMN IF EXISTS search_tsv;
ALTER TABLE anime DROP COLUMN IF EXISTS search_tsv;

-- (4) Funktionale Normalisierungs-Indizes (D-04-Gleichheitspfad).
DROP INDEX IF EXISTS idx_fansub_groups_slug_norm;
DROP INDEX IF EXISTS idx_fansub_groups_name_norm;

-- (3) Funktionale GIN-Trigram-Indizes ueber f_unaccent(<col>).
DROP INDEX IF EXISTS idx_fansub_group_aliases_normalized_unaccent_trgm;
DROP INDEX IF EXISTS idx_fansub_groups_slug_unaccent_trgm;
DROP INDEX IF EXISTS idx_fansub_groups_name_unaccent_trgm;
DROP INDEX IF EXISTS idx_anime_titles_title_unaccent_trgm;
DROP INDEX IF EXISTS idx_anime_title_unaccent_trgm;

-- (2) IMMUTABLE-Wrapper (jetzt referenzfrei -> kein CASCADE noetig).
DROP FUNCTION IF EXISTS f_unaccent(text);

-- (1) CREATE EXTENSION unaccent wird NICHT zurueckgerollt (siehe Kopfkommentar).
