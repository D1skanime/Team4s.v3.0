-- Migration 0015: Fansub Collaborations + Group Type
-- Adds support for collaboration groups (joint releases from multiple fansub groups)

-- 1. Add group_type field to fansub_groups
ALTER TABLE fansub_groups
ADD COLUMN group_type VARCHAR(20) NOT NULL DEFAULT 'group'
CHECK (group_type IN ('group', 'collaboration'));

-- 2. Create collaboration members table (which groups are part of a collaboration)
CREATE TABLE fansub_collaboration_members (
    collaboration_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_group_id  BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collaboration_id, member_group_id),
    CONSTRAINT no_self_reference CHECK (collaboration_id != member_group_id)
);

CREATE INDEX idx_fansub_collab_members_collab ON fansub_collaboration_members(collaboration_id);
CREATE INDEX idx_fansub_collab_members_member ON fansub_collaboration_members(member_group_id);

COMMENT ON TABLE fansub_collaboration_members IS 'Links collaboration groups to their member groups for joint releases';
COMMENT ON COLUMN fansub_groups.group_type IS 'group = regular fansub, collaboration = joint release from multiple groups';
