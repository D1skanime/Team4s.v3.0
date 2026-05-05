-- Migration 0056 down: Restore alias-side duplicate reference and remove compatibility comments.

ALTER TABLE fansub_group_aliases
    ADD COLUMN IF NOT EXISTS group_id BIGINT;

UPDATE fansub_group_aliases
SET group_id = fansub_group_id
WHERE group_id IS NULL;

ALTER TABLE fansub_group_aliases
    DROP CONSTRAINT IF EXISTS fansub_group_aliases_group_id_fkey;

ALTER TABLE fansub_group_aliases
    ADD CONSTRAINT fansub_group_aliases_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES fansub_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fansub_group_aliases_group
    ON fansub_group_aliases(group_id);

COMMENT ON COLUMN fansub_groups.closed_year IS NULL;
COMMENT ON COLUMN fansub_groups.history_description IS NULL;
COMMENT ON COLUMN fansub_groups.website_url IS NULL;
COMMENT ON COLUMN fansub_groups.discord_url IS NULL;
COMMENT ON COLUMN fansub_groups.irc_url IS NULL;
