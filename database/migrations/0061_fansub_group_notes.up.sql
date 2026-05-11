CREATE TABLE IF NOT EXISTS fansub_group_notes (
    id                  BIGSERIAL PRIMARY KEY,
    fansub_group_id     BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL DEFAULT '',
    body_markdown       TEXT NOT NULL DEFAULT '',
    body_html           TEXT NOT NULL DEFAULT '',
    visibility          VARCHAR(20) NOT NULL DEFAULT 'internal'
        CONSTRAINT chk_fansub_group_notes_visibility CHECK (visibility IN ('public', 'internal')),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
        CONSTRAINT chk_fansub_group_notes_status CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    sort_order          INT NOT NULL DEFAULT 0,
    created_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ NULL,
    deleted_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_notes_group_id
    ON fansub_group_notes(fansub_group_id)
    WHERE deleted_at IS NULL;
