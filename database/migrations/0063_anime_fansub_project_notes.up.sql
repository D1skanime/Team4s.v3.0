CREATE TABLE IF NOT EXISTS anime_fansub_project_notes (
    id                  BIGSERIAL PRIMARY KEY,
    anime_id            BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    fansub_group_id     BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL DEFAULT '',
    body_markdown       TEXT NOT NULL DEFAULT '',
    body_html           TEXT NOT NULL DEFAULT '',
    visibility          VARCHAR(20) NOT NULL DEFAULT 'internal'
        CONSTRAINT chk_anime_fansub_project_notes_visibility CHECK (visibility IN ('public', 'internal')),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
        CONSTRAINT chk_anime_fansub_project_notes_status CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    sort_order          INT NOT NULL DEFAULT 0,
    created_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ NULL,
    deleted_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

-- MVP: Ein Haupttext pro Anime+Gruppe (UNIQUE nur wenn nicht gelöscht)
CREATE UNIQUE INDEX IF NOT EXISTS uq_anime_fansub_project_notes_main
    ON anime_fansub_project_notes(anime_id, fansub_group_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_anime_fansub_project_notes_group_id
    ON anime_fansub_project_notes(fansub_group_id)
    WHERE deleted_at IS NULL;
