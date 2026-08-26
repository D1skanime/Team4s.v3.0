-- Quick 260826-l5l: Behebt den pg_restore-Defekt in f_unaccent (Befund 1,
-- .planning/notes/2026-08-26-keycloak-upgrade-und-voll-reset.md).
--
-- Ursache: pg_dump schreibt an den Anfang jedes Dumps
-- SELECT pg_catalog.set_config('search_path', '', false); -- also einen LEEREN
-- search_path. 0140_search_foundation.up.sql:19-27 definiert f_unaccent mit dem
-- UNQUALIFIZIERTEN Aufruf SELECT unaccent('unaccent', $1). Beim Restore ist
-- unaccent damit nicht auflösbar, der funktionale GIN-Trigram-Index auf anime
-- scheitert, anime entsteht nicht, und 85 abhängige Objekte fallen nach.
-- Gemessen 2026-08-26: 89 Fehler bei einem realen pg_dump/pg_restore-Roundtrip,
-- Backup nicht restorebar ohne den dokumentierten sed-Workaround.
--
-- Fix: der Funktionskörper qualifiziert sowohl den Funktionsaufruf als auch den
-- Dictionary-Namen mit dem Schema public, sodass die Auflösung auch bei leerem
-- search_path gelingt -- genau das, was pg_dump an den Anfang jedes Dumps setzt.
--
-- Der Migrate-Runner (backend/internal/migrations/runner.go) führt jede Datei
-- bereits in einer eigenen Transaktion aus -> kein explizites BEGIN/COMMIT
-- (analog 0140).

CREATE OR REPLACE FUNCTION f_unaccent(text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    STRICT
AS $$
    SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;

-- Bewusst OHNE "SET search_path = public" auf der Funktion selbst: eine
-- SQL-Funktion mit SET-Klausel kann vom Planer nicht mehr geinlined werden,
-- was jeden Suchaufruf teurer macht (die fünf *_unaccent_trgm-GIN-Indizes plus
-- die zwei generierten tsvector-Spalten anime.search_tsv/fansub_groups.search_tsv).
-- Der schema-qualifizierte Funktionskörper allein behebt den Restore-Defekt,
-- ohne diese Kosten einzuführen.
