-- Migration 0115: Startdatum aktiver Fansub-Gruppenrollen.
-- NULL fuer Bestandszeilen; neue Schreibpfade befuellen tenure_started_on.

BEGIN;

ALTER TABLE fansub_group_member_roles
    ADD COLUMN IF NOT EXISTS tenure_started_on DATE NULL;

COMMIT;
