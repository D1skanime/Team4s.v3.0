DELETE FROM role_capabilities
WHERE action_code = 'release_version.segments.manage';

DELETE FROM action_definitions
WHERE code = 'release_version.segments.manage';
