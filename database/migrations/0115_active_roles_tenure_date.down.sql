-- Rollback Migration 0115: Startdatum aktiver Fansub-Gruppenrollen entfernen.

BEGIN;

ALTER TABLE fansub_group_member_roles
    DROP COLUMN IF EXISTS tenure_started_on;

COMMIT;
