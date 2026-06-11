-- Migration 0104: members-Backfill für App-Member + fansub_group_members.member_id-Spalte.
-- Abhängigkeiten: 0044 (members), 0072 (app_users.legacy_user_id, display_name),
--                 0073 (fansub_group_members), 0081 (member_claims), 0082 (hist_fansub_group_members)
-- Zweck (D-02): Jeder App-Member bekommt eine members-Zeile (Self-Claim-Fundament).
--              fansub_group_members erhält member_id BIGINT NULL → members(id) für Phase-82-Downstream.

BEGIN;

-- ============================================================
-- Schritt A: Neue members-Zeilen für App-Member ohne members-Verknüpfung
-- Für jede fansub_group_members-Zeile, bei der weder ein verified member_claim
-- (mc.member_id) noch ein legacy-Match (members.user_id via app_users.legacy_user_id)
-- existiert, wird eine neue members-Zeile aus app_users.display_name angelegt.
-- COALESCE-Reihenfolge: claim → legacy → new (deterministisch, T-82-01-02)
-- ============================================================
INSERT INTO members (nickname, created_at, updated_at)
SELECT DISTINCT
    COALESCE(NULLIF(TRIM(au.display_name), ''), 'Mitglied') AS nickname,
    NOW(),
    NOW()
FROM fansub_group_members fgm
JOIN app_users au ON au.id = fgm.app_user_id
LEFT JOIN LATERAL (
    SELECT mc.member_id
    FROM member_claims mc
    WHERE mc.app_user_id = fgm.app_user_id
      AND mc.claim_status = 'verified'
    ORDER BY mc.verified_at DESC NULLS LAST, mc.id DESC
    LIMIT 1
) mc ON true
LEFT JOIN members m_legacy
    ON m_legacy.user_id = au.legacy_user_id
WHERE mc.member_id IS NULL
  AND m_legacy.id IS NULL;

-- ============================================================
-- Schritt B: Neue Spalte member_id nullable zu fansub_group_members hinzufügen
-- ============================================================
ALTER TABLE fansub_group_members
    ADD COLUMN IF NOT EXISTS member_id BIGINT NULL REFERENCES members(id) ON DELETE RESTRICT;

-- ============================================================
-- Schritt C: Backfill fansub_group_members.member_id
-- Reihenfolge: (1) verified claim, (2) legacy-Match über users.id, (3) gerade angelegte Zeile
-- Alle drei Quellen greifen auf denselben app_user_id zurück — kein Mehrfach-Match möglich.
-- ============================================================
UPDATE fansub_group_members fgm
SET member_id = COALESCE(mc.member_id, m_legacy.id, m_new.id)
FROM app_users au
LEFT JOIN LATERAL (
    SELECT mc2.member_id
    FROM member_claims mc2
    WHERE mc2.app_user_id = au.id
      AND mc2.claim_status = 'verified'
    ORDER BY mc2.verified_at DESC NULLS LAST, mc2.id DESC
    LIMIT 1
) mc ON true
LEFT JOIN members m_legacy
    ON m_legacy.user_id = au.legacy_user_id
-- Die in Schritt A angelegte Zeile: keine claim, kein legacy, nickname aus display_name
LEFT JOIN LATERAL (
    SELECT m3.id
    FROM members m3
    WHERE m3.user_id IS NULL
      AND m3.nickname = COALESCE(NULLIF(TRIM(au.display_name), ''), 'Mitglied')
      AND mc.member_id IS NULL
      AND m_legacy.id IS NULL
    ORDER BY m3.id DESC
    LIMIT 1
) m_new ON true
WHERE fgm.app_user_id = au.id
  AND fgm.member_id IS NULL;

-- ============================================================
-- Schritt D: Index anlegen
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fansub_group_members_member_id
    ON fansub_group_members(member_id)
    WHERE member_id IS NOT NULL;

COMMIT;
