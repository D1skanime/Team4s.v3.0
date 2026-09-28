-- Migration 0172 rollback: remove only the additive highlight relation and catalog rows.

BEGIN;
DELETE FROM role_capabilities
WHERE role_code = 'project_lead'
  AND action_code IN ('release_version_media.reorder', 'release_version_media.highlight');
DELETE FROM action_definitions
WHERE code IN ('release_version_media.reorder', 'release_version_media.highlight');
DROP TABLE IF EXISTS release_version_media_highlights;
COMMIT;
