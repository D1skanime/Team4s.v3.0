-- Migration 0182 rollback: remove the release_version_theme_asset.upload capability.

BEGIN;

DELETE FROM role_capabilities
WHERE action_code = 'release_version_theme_asset.upload';

DELETE FROM action_definitions
WHERE code = 'release_version_theme_asset.upload';

COMMIT;
