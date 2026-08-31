BEGIN;

DELETE FROM role_capabilities
WHERE action_code = 'release_version.metadata.update';

DELETE FROM action_definitions
WHERE code = 'release_version.metadata.update';

ALTER TABLE release_versions
    DROP COLUMN production_started_on;

ALTER TABLE anime_fansub_groups
    DROP CONSTRAINT chk_anime_fansub_groups_production_timeline,
    DROP COLUMN production_completed_on,
    DROP COLUMN production_started_on;

COMMIT;
