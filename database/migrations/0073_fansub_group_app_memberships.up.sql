-- Migration 0073: App-user-backed fansub group membership and role seams.

CREATE TABLE IF NOT EXISTS fansub_group_members (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    updated_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fansub_group_members_group_user UNIQUE (fansub_group_id, app_user_id),
    CONSTRAINT chk_fansub_group_members_status CHECK (status IN ('active', 'disabled'))
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_members_group
    ON fansub_group_members(fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_fansub_group_members_user
    ON fansub_group_members(app_user_id);
CREATE INDEX IF NOT EXISTS idx_fansub_group_members_status
    ON fansub_group_members(status);

CREATE TABLE IF NOT EXISTS fansub_group_member_roles (
    fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fansub_group_member_id, role),
    CONSTRAINT chk_fansub_group_member_roles_role CHECK (role IN ('fansub_lead'))
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_member_roles_role
    ON fansub_group_member_roles(role);
