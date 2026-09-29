-- Migration 0173 rollback: remove the assignable all-member note visibility capability.

BEGIN;

DELETE FROM role_capabilities
WHERE action_code = 'release_version.notes.view_all';

DELETE FROM action_definitions
WHERE code = 'release_version.notes.view_all';

COMMIT;
