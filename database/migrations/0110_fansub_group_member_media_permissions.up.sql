BEGIN;

CREATE TABLE IF NOT EXISTS fansub_group_member_media_permissions (
    fansub_group_member_id BIGINT PRIMARY KEY REFERENCES fansub_group_members(id) ON DELETE CASCADE,
    can_upload BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_own BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_all BOOLEAN NOT NULL DEFAULT FALSE,
    can_reorder BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_member_media_permissions_active
    ON fansub_group_member_media_permissions(fansub_group_member_id)
    WHERE can_upload OR can_delete_own OR can_delete_all OR can_reorder;

COMMIT;
