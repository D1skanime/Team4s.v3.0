DROP INDEX IF EXISTS idx_hist_fansub_group_members_confirmed_by;

ALTER TABLE hist_fansub_group_members
    DROP COLUMN IF EXISTS confirmed_at,
    DROP COLUMN IF EXISTS confirmed_by;
