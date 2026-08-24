-- Migration 0057: Drop legacy release_version_groups.fansubgroup_id.
-- Runtime uses release_version_groups.fansub_group_id as the only source of truth.

DO $$
DECLARE
    mismatched_rows BIGINT := 0;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ANY (current_schemas(false))
          AND table_name = 'release_version_groups'
          AND column_name = 'fansubgroup_id'
    ) THEN
        SELECT COUNT(*) INTO mismatched_rows
        FROM release_version_groups
        WHERE fansubgroup_id IS NOT NULL
          AND fansubgroup_id <> fansub_group_id;

        IF mismatched_rows > 0 THEN
            RAISE EXCEPTION
                'Cannot drop release_version_groups.fansubgroup_id: % mismatched rows differ from fansub_group_id',
                mismatched_rows;
        END IF;
    END IF;
END $$;

ALTER TABLE release_version_groups
    DROP CONSTRAINT IF EXISTS release_version_groups_fansubgroup_id_fkey;

DROP INDEX IF EXISTS idx_release_version_group_group;
DROP INDEX IF EXISTS idx_release_version_group_version;

ALTER TABLE release_version_groups
    DROP COLUMN IF EXISTS fansubgroup_id;
