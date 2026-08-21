-- Migration 0150 rollback: remove the Phase-137 catalog delta in dependency
-- order without touching migration 0146's own objects or data.

BEGIN;

DELETE FROM role_capabilities
WHERE role_code = 'fansub_lead'
  AND action_code = 'user_group_capability_override.manage';

UPDATE action_definitions
SET user_overridable = false
WHERE code IN (
    'fansub_group_media.upload',
    'fansub_group_media.update',
    'fansub_group_media.reorder',
    'fansub_group_page.general_edit',
    'fansub_group_page.technical_links_edit',
    'fansub_group_page.founding_history_edit',
    'fansub_group_links.update',
    'review.text.decide',
    'review.image.decide',
    'review.contribution.decide'
);

DELETE FROM action_definitions
WHERE code = 'user_group_capability_override.manage';

COMMIT;
