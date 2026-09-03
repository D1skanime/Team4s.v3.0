-- Migration 0160 down: reverse the membership-baseline pseudo-role in reverse order.

BEGIN;

DELETE FROM role_capabilities WHERE role_code = 'group_member';
DELETE FROM role_definitions WHERE code = 'group_member';
ALTER TABLE role_definitions DROP COLUMN IF EXISTS reserved;

COMMIT;
