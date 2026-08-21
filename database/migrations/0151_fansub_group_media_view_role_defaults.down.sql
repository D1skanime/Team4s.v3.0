-- Migration 0151 rollback: remove exactly the four role/action grants added
-- by the up migration. The role_code IN (...) filter is mandatory so that
-- migration 0109's original two fansub_group_media.view seeds are never
-- touched by this rollback.

BEGIN;

DELETE FROM role_capabilities
WHERE action_code = 'fansub_group_media.view'
  AND role_code IN ('co_leader', 'founder', 'gfxler', 'techadmin');

COMMIT;
