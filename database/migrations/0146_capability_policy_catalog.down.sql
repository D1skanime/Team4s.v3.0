-- Migration 0146 rollback: remove policy objects and catalog additions in dependency order.

BEGIN;

DROP TRIGGER IF EXISTS trg_user_group_capability_override_history_append_only
    ON user_group_capability_override_history;
DROP FUNCTION IF EXISTS prevent_user_group_capability_override_history_mutation();

DROP TABLE IF EXISTS user_group_capability_override_history;
DROP TABLE IF EXISTS user_group_capability_overrides;

DROP INDEX IF EXISTS role_capabilities_action_role_idx;

DELETE FROM action_definitions
WHERE code IN (
    'fansub_group_media.upload',
    'fansub_group_media.update',
    'fansub_group_media.reorder',
    'fansub_group_page.general_edit',
    'fansub_group_page.technical_links_edit',
    'fansub_group_page.founding_history_edit',
    'fansub_group_links.update'
);

DELETE FROM role_definitions WHERE code = 'karaoke_fx';

ALTER TABLE role_definitions
    DROP CONSTRAINT IF EXISTS chk_role_definitions_icon_key,
    DROP CONSTRAINT IF EXISTS chk_role_definitions_color_key,
    DROP COLUMN IF EXISTS icon_key,
    DROP COLUMN IF EXISTS color_key;

ALTER TABLE action_definitions
    DROP CONSTRAINT IF EXISTS chk_action_definitions_user_override_policy,
    DROP CONSTRAINT IF EXISTS uq_action_definitions_code_override_policy,
    DROP COLUMN IF EXISTS user_overridable,
    DROP COLUMN IF EXISTS help_text_de,
    DROP COLUMN IF EXISTS description_de;

COMMIT;
