-- Rollback Migration 0103: remove group_history from app contribution roles that
-- did not historically carry that context before this migration.
--
-- Keep fansub_lead and project_lead unchanged because earlier migrations already
-- define them for group_history.

UPDATE role_definitions
SET contexts = array_remove(contexts, 'group_history')
WHERE code IN (
    'translator',
    'timer',
    'typesetter',
    'editor',
    'encoder',
    'raw_provider',
    'quality_checker',
    'designer'
);
