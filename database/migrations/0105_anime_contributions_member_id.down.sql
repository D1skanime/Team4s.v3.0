-- Migration 0105 DOWN: Kehrt den Ankerwechsel von anime_contributions um.
-- Stellt fansub_group_member_id als NOT NULL-Pflichtfeld wieder her,
-- tauscht den Unique-Key zurück und entfernt die member_id-Spalte.

BEGIN;

DROP INDEX IF EXISTS idx_anime_contributions_member_id;

-- fansub_group_member_id wieder NOT NULL setzen
-- (Voraussetzung: alle Zeilen haben noch einen Wert — Übergangsphase war nullable, nicht geleert)
ALTER TABLE anime_contributions
    ALTER COLUMN fansub_group_member_id SET NOT NULL;

-- Unique-Key zurücktauschen auf fansub_group_member_id
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;

ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id);

-- member_id-Spalte entfernen
ALTER TABLE anime_contributions
    DROP COLUMN IF EXISTS member_id;

COMMIT;
