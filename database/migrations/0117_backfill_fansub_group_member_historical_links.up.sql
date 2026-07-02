-- Migration 0117: repariert App-Mitgliedschaften, die ueber historische Identitaeten
-- verknuepft wurden, aber keinen fansub_group_members.member_id-Anker erhalten haben.
--
-- Sicherheit:
-- - Der Backfill nutzt nur verified member_claims.
-- - Der Member muss in hist_fansub_group_members zur selben fansub_group_id existieren.
-- - Bereits gesetzte member_id-Werte werden nicht ueberschrieben.

BEGIN;

WITH linked_members AS (
    SELECT DISTINCT ON (fgm.id)
        fgm.id AS fansub_group_member_id,
        mc.member_id
    FROM fansub_group_members fgm
    JOIN member_claims mc
      ON mc.app_user_id = fgm.app_user_id
     AND mc.claim_status = 'verified'
    JOIN hist_fansub_group_members hfgm
      ON hfgm.member_id = mc.member_id
     AND hfgm.fansub_group_id = fgm.fansub_group_id
    WHERE fgm.member_id IS NULL
    ORDER BY fgm.id, mc.verified_at DESC NULLS LAST, mc.id DESC
)
UPDATE fansub_group_members fgm
SET
    member_id = linked.member_id,
    updated_at = NOW()
FROM linked_members linked
WHERE fgm.id = linked.fansub_group_member_id
  AND fgm.member_id IS NULL;

COMMIT;
