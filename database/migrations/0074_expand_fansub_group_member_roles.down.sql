ALTER TABLE fansub_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_fansub_group_member_roles_role;

ALTER TABLE fansub_group_member_roles
    ADD CONSTRAINT chk_fansub_group_member_roles_role
    CHECK (role IN ('fansub_lead'));
