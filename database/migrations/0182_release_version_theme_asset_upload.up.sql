-- Migration 0182: register a dedicated release_version_theme_asset.upload capability
-- (D-12) so the two theme-asset upload handlers stop reusing the foreign
-- release_version_media.upload action. Role list is a byte-for-byte copy of
-- release_version_media.upload's live-DB-verified role set.

BEGIN;

INSERT INTO action_definitions (
    code, label_de, category, sort_order, description_de, help_text_de, user_overridable
) VALUES (
    'release_version_theme_asset.upload',
    'Theme-Video hochladen',
    'release',
    90,
    'Theme-Video (Opening/Ending) für eine Release-Version hochladen.',
    NULL,
    false
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    description_de = EXCLUDED.description_de,
    help_text_de = EXCLUDED.help_text_de,
    user_overridable = EXCLUDED.user_overridable;

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('designer', 'release_version_theme_asset.upload'),
    ('editor', 'release_version_theme_asset.upload'),
    ('encoder', 'release_version_theme_asset.upload'),
    ('fansub_lead', 'release_version_theme_asset.upload'),
    ('karaoke_fx', 'release_version_theme_asset.upload'),
    ('project_lead', 'release_version_theme_asset.upload'),
    ('quality_checker', 'release_version_theme_asset.upload'),
    ('raw_provider', 'release_version_theme_asset.upload'),
    ('timer', 'release_version_theme_asset.upload'),
    ('translator', 'release_version_theme_asset.upload'),
    ('typesetter', 'release_version_theme_asset.upload')
ON CONFLICT DO NOTHING;

COMMIT;
