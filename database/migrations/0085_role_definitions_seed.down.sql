-- Migration 0085 rollback: remove FK constraint and role_definitions table.
-- Seed data is removed together with the table.

ALTER TABLE hist_group_member_roles
    DROP CONSTRAINT IF EXISTS fk_hist_group_member_roles_role_code;

DROP TABLE IF EXISTS role_definitions;
