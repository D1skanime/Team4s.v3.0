-- Reverts migration 0178 (drop member_group_stories).
-- Recreates the table in its final shape by combining 0062's base CREATE TABLE with
-- 0068's TipTap column additions into a single reversible CREATE TABLE statement.
--
-- WR-06 (176-REVIEW): this migration rollback is schema-only. The entire backend handler
-- surface (admin_content_member_stories.go), repository
-- (member_group_stories_repository.go, member_group_story_context_repository.go), and
-- frontend API/UI surface for this table were deleted in the SAME phase as the 0178 up
-- migration (commits a272acdc/e7481732). Running `migrate down` on this file alone recreates
-- an empty table that nothing in the current codebase can read or write -- it is not a
-- functional rollback by itself. To actually restore the Member-Group-Story feature, also
-- revert commits a272acdc and e7481732 (or re-implement equivalent code against this
-- recreated schema). This is intentional: down migrations in this codebase exist for
-- emergency schema rollback of their paired up migration, not for restoring a deleted
-- feature's application code -- but that tradeoff is only safe to rely on if it is written
-- down here, not just in commit messages someone under time pressure may not have time to go
-- find.
CREATE TABLE IF NOT EXISTS member_group_stories (
    id                  BIGSERIAL PRIMARY KEY,
    fansub_group_id     BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_id           BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id             BIGINT NULL REFERENCES contributor_roles(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL DEFAULT '',
    body_markdown       TEXT NOT NULL DEFAULT '',
    body_html           TEXT NOT NULL DEFAULT '',
    body_json           JSONB  NULL,
    body_text           TEXT   NOT NULL DEFAULT '',
    editor_type         TEXT   NOT NULL DEFAULT 'tiptap',
    content_schema_version INT NOT NULL DEFAULT 1,
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
