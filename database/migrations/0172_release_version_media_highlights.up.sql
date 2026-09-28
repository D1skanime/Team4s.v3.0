-- Migration 0172: independent release-version media highlights and scoped curation rights.
-- Additive only: no existing release-version-media rows are backfilled.

BEGIN;

CREATE TABLE release_version_media_highlights (
    release_version_media_id BIGINT PRIMARY KEY
        REFERENCES release_version_media(id) ON DELETE CASCADE,
    highlight_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_release_version_media_highlight_order
        CHECK (highlight_order >= 0)
);

CREATE INDEX idx_rvm_highlights_order
    ON release_version_media_highlights (highlight_order, release_version_media_id);

INSERT INTO action_definitions (
    code, label_de, category, sort_order, description_de, help_text_de, user_overridable
) VALUES
    ('release_version_media.reorder', 'Release-Medien sortieren', 'veroeffentlichungen', 240,
     'Die Reihenfolge der Medien einer Release-Version ändern.',
     'Gilt ausschließlich innerhalb der zugehörigen Release-Version.', true),
    ('release_version_media.highlight', 'Release-Medien hervorheben', 'veroeffentlichungen', 250,
     'Medien einer Release-Version als Highlights markieren und sortieren.',
     'Gilt ausschließlich innerhalb der zugehörigen Release-Version.', true)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    description_de = EXCLUDED.description_de,
    help_text_de = EXCLUDED.help_text_de,
    user_overridable = EXCLUDED.user_overridable;

INSERT INTO role_capabilities (role_code, action_code)
VALUES ('project_lead', 'release_version_media.reorder'),
       ('project_lead', 'release_version_media.highlight')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;
