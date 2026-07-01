-- Migration 0116 DOWN: Remove historical member capability split.

BEGIN;

DELETE FROM role_capabilities
WHERE action_code IN (
    'fansub_group.historical_members.manage',
    'fansub_group.historical_roles.manage',
    'fansub_group.historical_members.link'
);

DELETE FROM action_definitions
WHERE code IN (
    'fansub_group.historical_members.manage',
    'fansub_group.historical_roles.manage',
    'fansub_group.historical_members.link'
);

COMMIT;
