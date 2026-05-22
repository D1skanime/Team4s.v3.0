-- Migration 0072: Keycloak-backed app user foundation for Phase 43.

CREATE TABLE IF NOT EXISTS app_users (
    id BIGSERIAL PRIMARY KEY,
    legacy_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    keycloak_subject VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    preferred_username VARCHAR(120),
    given_name VARCHAR(120),
    family_name VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    last_login_at TIMESTAMPTZ,
    last_logout_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_users_keycloak_subject UNIQUE (keycloak_subject),
    CONSTRAINT chk_app_users_status CHECK (status IN ('pending', 'active', 'disabled'))
);

CREATE INDEX IF NOT EXISTS idx_app_users_legacy_user
    ON app_users(legacy_user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_status
    ON app_users(status);

CREATE TABLE IF NOT EXISTS app_user_global_roles (
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (app_user_id, role),
    CONSTRAINT chk_app_user_global_roles_role CHECK (role IN ('platform_admin', 'content_admin', 'user'))
);

CREATE INDEX IF NOT EXISTS idx_app_user_global_roles_role
    ON app_user_global_roles(role);
