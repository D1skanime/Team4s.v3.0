-- Migration 0057 down: Restore legacy release_version_groups.fansubgroup_id.
-- The restored column is backfilled from the canonical fansub_group_id value.

ALTER TABLE public.release_version_groups
    ADD COLUMN IF NOT EXISTS fansubgroup_id BIGINT;

UPDATE public.release_version_groups
SET fansubgroup_id = fansub_group_id
WHERE fansubgroup_id IS DISTINCT FROM fansub_group_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.release_version_groups'::regclass
          AND conname = 'release_version_groups_fansubgroup_id_fkey'
    ) THEN
        ALTER TABLE public.release_version_groups
            ADD CONSTRAINT release_version_groups_fansubgroup_id_fkey
            FOREIGN KEY (fansubgroup_id) REFERENCES public.fansub_groups(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_release_version_group_group
    ON public.release_version_groups(fansubgroup_id);

CREATE INDEX IF NOT EXISTS idx_release_version_group_version
    ON public.release_version_groups(release_version_id);
