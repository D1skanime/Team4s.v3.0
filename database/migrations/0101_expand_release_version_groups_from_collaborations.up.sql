-- Migration 0101: Expand release_version_groups from collaboration members (Phase 81)
-- Materialises real member-group IDs into junction tables, then deactivates/deletes
-- collaboration groups (D-11, D-12).

-- Step 1: release_version_groups — insert member IDs for every collaboration group
INSERT INTO release_version_groups (release_version_id, fansub_group_id)
SELECT rvg.release_version_id, fcm.member_group_id
FROM release_version_groups rvg
JOIN fansub_groups fg
    ON fg.id = rvg.fansub_group_id
   AND fg.group_type = 'collaboration'
JOIN fansub_collaboration_members fcm
    ON fcm.collaboration_id = fg.id
ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING;

-- Step 2: anime_fansub_groups — insert member IDs for every collaboration group
INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes)
SELECT afg.anime_id, fcm.member_group_id, false, NULL
FROM anime_fansub_groups afg
JOIN fansub_groups fg
    ON fg.id = afg.fansub_group_id
   AND fg.group_type = 'collaboration'
JOIN fansub_collaboration_members fcm
    ON fcm.collaboration_id = fg.id
ON CONFLICT (anime_id, fansub_group_id) DO NOTHING;

-- Step 3: theme_segments — clear collaboration group references (Pitfall 1, D-11)
UPDATE theme_segments
SET fansub_group_id = NULL
WHERE fansub_group_id IN (
    SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
);

-- Step 4: segment_library_definitions — clear collaboration group references (analog Schritt 3)
UPDATE segment_library_definitions
SET fansub_group_id = NULL
WHERE fansub_group_id IN (
    SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
);

-- Step 5: release_version_groups — remove collaboration group rows (now replaced by members)
DELETE FROM release_version_groups
WHERE fansub_group_id IN (
    SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
);

-- Step 6: anime_fansub_groups — remove collaboration group rows (now replaced by members)
DELETE FROM anime_fansub_groups
WHERE fansub_group_id IN (
    SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
);

-- Step 7: deactivate or delete collaboration groups (D-12)
-- Hard-delete only when no RESTRICT-referenced rows exist;
-- dissolve otherwise to preserve audit trail.
DO $$
DECLARE
    collab_id       BIGINT;
    has_restrict_refs BOOLEAN;
BEGIN
    FOR collab_id IN
        SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
    LOOP
        SELECT (
            EXISTS (SELECT 1 FROM hist_fansub_group_members WHERE fansub_group_id = collab_id)
            OR EXISTS (SELECT 1 FROM anime_contributions   WHERE fansub_group_id = collab_id)
            OR EXISTS (SELECT 1 FROM theme_segments        WHERE fansub_group_id = collab_id)
            OR EXISTS (SELECT 1 FROM segment_library_definitions WHERE fansub_group_id = collab_id)
        ) INTO has_restrict_refs;

        IF has_restrict_refs THEN
            UPDATE fansub_groups
            SET status = 'dissolved',
                updated_at = NOW()
            WHERE id = collab_id;
        ELSE
            DELETE FROM fansub_groups WHERE id = collab_id;
        END IF;
    END LOOP;
END $$;
