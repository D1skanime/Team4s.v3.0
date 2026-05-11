CREATE TABLE IF NOT EXISTS release_version_notes (
    id                   BIGSERIAL PRIMARY KEY,
    release_version_id   BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    member_id            BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id              BIGINT NOT NULL REFERENCES contributor_roles(id) ON DELETE RESTRICT,
    title                VARCHAR(255) NULL,
    body_markdown        TEXT NOT NULL DEFAULT '',
    body_html            TEXT NOT NULL DEFAULT '',
    visibility           VARCHAR(20) NOT NULL DEFAULT 'internal'
        CONSTRAINT chk_release_version_notes_visibility CHECK (visibility IN ('public', 'internal')),
    status               VARCHAR(20) NOT NULL DEFAULT 'draft'
        CONSTRAINT chk_release_version_notes_status CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    sort_order           INT NOT NULL DEFAULT 0,
    created_by_user_id   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ,
    deleted_at           TIMESTAMPTZ NULL,
    deleted_by_user_id   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

-- Eindeutigkeit: Ein Member kann pro Rolle+Version nur eine aktive Note haben
CREATE UNIQUE INDEX IF NOT EXISTS uq_release_version_notes_member_role
    ON release_version_notes(release_version_id, member_id, role_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_release_version_notes_version_id
    ON release_version_notes(release_version_id)
    WHERE deleted_at IS NULL;
