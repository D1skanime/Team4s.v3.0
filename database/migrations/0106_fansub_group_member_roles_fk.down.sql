-- Migration 0106 DOWN: Stellt den hartkodiertem CHECK-Constraint wieder her.
-- FK wird entfernt, Spaltentyp auf VARCHAR(40) zurückgesetzt.

BEGIN;

ALTER TABLE fansub_group_member_roles
    DROP CONSTRAINT IF EXISTS fk_fansub_group_member_roles_role_code;

ALTER TABLE fansub_group_member_roles
    ALTER COLUMN role TYPE VARCHAR(40);

ALTER TABLE fansub_group_member_roles
    ADD CONSTRAINT chk_fansub_group_member_roles_role
    CHECK (
        role IN (
            'fansub_lead',
            'project_lead',
            'translator',
            'timer',
            'typesetter',
            'editor',
            'encoder',
            'raw_provider',
            'quality_checker',
            'designer'
        )
    );

COMMIT;
