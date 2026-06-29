BEGIN;

DROP INDEX IF EXISTS idx_fansub_group_member_media_permissions_active;
DROP TABLE IF EXISTS fansub_group_member_media_permissions;

COMMIT;
