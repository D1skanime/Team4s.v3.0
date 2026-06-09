-- Migration 0102: Drop collaboration schema (Phase 81, D-02)
-- Removes fansub_collaboration_members table and group_type column from fansub_groups.
-- Must run after migration 0101 and after new Go code is deployed (no writes to
-- fansub_collaboration_members or group_type='collaboration' in flight).

-- Guard: fail fast if any active collaboration groups remain (should be 0 after 0101)
DO $$
DECLARE
    active_collabs BIGINT;
BEGIN
    SELECT COUNT(*) INTO active_collabs
    FROM fansub_groups
    WHERE group_type = 'collaboration'
      AND status = 'active';

    IF active_collabs > 0 THEN
        RAISE EXCEPTION
            'Cannot drop collaboration schema: % active collaboration groups remain',
            active_collabs;
    END IF;
END $$;

DROP TABLE IF EXISTS fansub_collaboration_members;

ALTER TABLE fansub_groups DROP COLUMN IF EXISTS group_type;
