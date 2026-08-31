BEGIN;

DELETE FROM role_capabilities
WHERE action_code = 'fansub_group_media.update_own';

DELETE FROM action_definitions
WHERE code = 'fansub_group_media.update_own';

COMMIT;
