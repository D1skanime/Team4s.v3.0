-- Migration 0120: stellt sicher, dass aktive App-Gruppenmitglieder einen members.id-Anker haben.
-- Ohne diesen Anker können App-Member nicht als Anime-/Release-Mitwirkende ausgewählt werden.

BEGIN;

WITH resolved AS (
    SELECT
        fgm.id AS fansub_group_member_id,
        COALESCE(claimed.member_id, legacy_m.id, existing.member_id) AS member_id
    FROM fansub_group_members fgm
    JOIN app_users au ON au.id = fgm.app_user_id
    LEFT JOIN LATERAL (
        SELECT mc.member_id
        FROM member_claims mc
        WHERE mc.app_user_id = au.id
          AND mc.claim_status = 'verified'
        ORDER BY mc.verified_at DESC NULLS LAST, mc.id DESC
        LIMIT 1
    ) claimed ON true
    LEFT JOIN members legacy_m ON legacy_m.user_id = au.legacy_user_id
    LEFT JOIN LATERAL (
        SELECT fgm_existing.member_id
        FROM fansub_group_members fgm_existing
        WHERE fgm_existing.app_user_id = au.id
          AND fgm_existing.member_id IS NOT NULL
        ORDER BY fgm_existing.id DESC
        LIMIT 1
    ) existing ON true
    WHERE fgm.member_id IS NULL
)
UPDATE fansub_group_members fgm
SET
    member_id = resolved.member_id,
    updated_at = NOW()
FROM resolved
WHERE fgm.id = resolved.fansub_group_member_id
  AND fgm.member_id IS NULL
  AND resolved.member_id IS NOT NULL;

DO $$
DECLARE
    rec RECORD;
    new_member_id BIGINT;
BEGIN
    FOR rec IN
        SELECT DISTINCT
            fgm.app_user_id,
            COALESCE(NULLIF(TRIM(au.display_name), ''), NULLIF(TRIM(au.preferred_username), ''), NULLIF(TRIM(au.email), ''), 'Mitglied') AS nickname
        FROM fansub_group_members fgm
        JOIN app_users au ON au.id = fgm.app_user_id
        WHERE fgm.member_id IS NULL
        ORDER BY fgm.app_user_id
    LOOP
        INSERT INTO members (nickname, created_at, updated_at)
        VALUES (rec.nickname, NOW(), NOW())
        RETURNING id INTO new_member_id;

        UPDATE fansub_group_members
        SET
            member_id = new_member_id,
            updated_at = NOW()
        WHERE app_user_id = rec.app_user_id
          AND member_id IS NULL;
    END LOOP;
END $$;

COMMIT;
