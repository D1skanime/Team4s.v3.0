BEGIN;

DELETE FROM role_capabilities
WHERE action_code IN (
    'fansub_group_media.view',
    'fansub_group_media.upload',
    'fansub_group_media.update',
    'fansub_group_media.delete'
);

DELETE FROM action_definitions
WHERE code IN (
    'fansub_group_media.view',
    'fansub_group_media.upload',
    'fansub_group_media.update',
    'fansub_group_media.delete'
);

DROP INDEX IF EXISTS idx_fansub_group_media_category;
DROP INDEX IF EXISTS idx_fansub_group_media_active_order;

ALTER TABLE fansub_group_media
    DROP CONSTRAINT IF EXISTS chk_fansub_group_media_category,
    DROP COLUMN IF EXISTS deleted_by_user_id,
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS uploaded_by_user_id,
    DROP COLUMN IF EXISTS sort_order,
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS alt_text,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS title;

COMMIT;
