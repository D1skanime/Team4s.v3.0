-- Migration 0104 DOWN: Entfernt die member_id-Spalte und den Index von fansub_group_members.
-- WICHTIG: Die in Schritt A angelegten members-Zeilen werden NICHT rückgängig gemacht —
-- dieser Teil ist irreversibel (neue members-Zeilen können bereits referenziert werden).

BEGIN;

DROP INDEX IF EXISTS idx_fansub_group_members_member_id;

ALTER TABLE fansub_group_members
    DROP COLUMN IF EXISTS member_id;

COMMIT;
