-- Migration 0102 down: Restore collaboration schema skeleton
-- Restores group_type column and fansub_collaboration_members table.
-- Note: data that was deleted by migration 0101 is NOT restored here.

ALTER TABLE fansub_groups
    ADD COLUMN IF NOT EXISTS group_type VARCHAR(20) NOT NULL DEFAULT 'group'
    CHECK (group_type IN ('group', 'collaboration'));

CREATE TABLE IF NOT EXISTS fansub_collaboration_members (
    collaboration_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_group_id  BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collaboration_id, member_group_id),
    CONSTRAINT no_self_reference CHECK (collaboration_id != member_group_id)
);

CREATE INDEX IF NOT EXISTS idx_fansub_collab_members_collab
    ON fansub_collaboration_members(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_fansub_collab_members_member
    ON fansub_collaboration_members(member_group_id);
