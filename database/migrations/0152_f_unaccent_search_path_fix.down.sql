-- Quick 260826-l5l: Rollback von 0152 -- stellt den ursprünglichen, restore-
-- unsicheren 0140-Funktionskörper wieder her. Nur zur Migrations-Reversibilität
-- vorgehalten, NICHT für den Produktiveinsatz empfohlen (siehe Befund 1,
-- .planning/notes/2026-08-26-keycloak-upgrade-und-voll-reset.md): mit diesem
-- Körper schlägt ein pg_restore aus einem pg_dump erneut fehl, weil pg_dump
-- einen leeren search_path setzt und der unqualifizierte unaccent-Aufruf dann
-- nicht auflösbar ist.
--
-- Kein explizites BEGIN/COMMIT: der Migrate-Runner wrappt jede Datei bereits
-- in eine eigene Transaktion (analog 0140).

CREATE OR REPLACE FUNCTION f_unaccent(text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    STRICT
AS $$
    SELECT unaccent('unaccent', $1)
$$;
