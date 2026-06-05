ALTER TABLE hist_fansub_group_members
    ADD COLUMN IF NOT EXISTS confirmed_by BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_hist_fansub_group_members_confirmed_by
    ON hist_fansub_group_members(confirmed_by);
