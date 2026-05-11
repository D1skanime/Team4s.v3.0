CREATE TABLE IF NOT EXISTS member_group_stories (
    id                  BIGSERIAL PRIMARY KEY,
    fansub_group_id     BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_id           BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id             BIGINT NULL REFERENCES contributor_roles(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL DEFAULT '',
    body_markdown       TEXT NOT NULL DEFAULT '',
    body_html           TEXT NOT NULL DEFAULT '',
    visibility          VARCHAR(20) NOT NULL DEFAULT 'internal'
        CONSTRAINT chk_member_group_stories_visibility CHECK (visibility IN ('public', 'internal')),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
        CONSTRAINT chk_member_group_stories_status CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    sort_order          INT NOT NULL DEFAULT 0,
    created_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ NULL,
    deleted_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_member_group_stories_group_id
    ON member_group_stories(fansub_group_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_group_stories_member_id
    ON member_group_stories(member_id)
    WHERE deleted_at IS NULL;
