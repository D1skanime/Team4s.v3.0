-- Migration 0107 DOWN: Entfernt die Stamm-Crew-Tabelle.

BEGIN;

DROP TABLE IF EXISTS fansub_group_default_crew;

COMMIT;
