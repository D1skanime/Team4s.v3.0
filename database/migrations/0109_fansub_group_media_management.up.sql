BEGIN;

ALTER TABLE fansub_group_media
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS alt_text TEXT,
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS uploaded_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_fansub_group_media_category'
    ) THEN
        ALTER TABLE fansub_group_media
            ADD CONSTRAINT chk_fansub_group_media_category
            CHECK (category IN (
                'gallery',
                'history_screenshot',
                'old_website',
                'forum',
                'irc_chat',
                'event_meeting',
                'artwork_fanart',
                'other'
            ));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fansub_group_media_active_order
    ON fansub_group_media(group_id, sort_order, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fansub_group_media_category
    ON fansub_group_media(category)
    WHERE deleted_at IS NULL;

INSERT INTO action_definitions (code, label_de, category, sort_order)
VALUES
    ('fansub_group_media.view', 'Gruppenmedien anzeigen', 'gruppe', 100),
    ('fansub_group_media.upload', 'Gruppenmedien hochladen', 'gruppe', 110),
    ('fansub_group_media.update', 'Gruppenmedien bearbeiten', 'gruppe', 120),
    ('fansub_group_media.delete', 'Gruppenmedien löschen', 'gruppe', 130)
ON CONFLICT (code) DO UPDATE
SET label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_capabilities (role_code, action_code)
VALUES
    ('fansub_lead', 'fansub_group_media.view'),
    ('fansub_lead', 'fansub_group_media.upload'),
    ('fansub_lead', 'fansub_group_media.update'),
    ('fansub_lead', 'fansub_group_media.delete'),
    ('project_lead', 'fansub_group_media.view'),
    ('project_lead', 'fansub_group_media.upload'),
    ('project_lead', 'fansub_group_media.update'),
    ('project_lead', 'fansub_group_media.delete')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;
