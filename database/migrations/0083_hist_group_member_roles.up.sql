-- Migration 0083: Historical group member roles — role periods per member.
-- FK on role_code → role_definitions is added in 0085 (role_definitions does not exist yet).

CREATE TABLE IF NOT EXISTS hist_group_member_roles (
    id                          BIGSERIAL PRIMARY KEY,
    hist_fansub_group_member_id BIGINT NOT NULL REFERENCES hist_fansub_group_members(id) ON DELETE CASCADE,
    role_code                   TEXT NOT NULL,
    started_year                INT NULL,
    ended_year                  INT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'historical',
    visibility                  VARCHAR(20) NOT NULL DEFAULT 'internal',
    confirmed_by                BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    confirmed_at                TIMESTAMPTZ NULL,
    source_note                 TEXT NULL,
    created_by                  BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_hist_group_member_roles_status     CHECK (status IN ('draft', 'historical', 'confirmed', 'disputed')),
    CONSTRAINT chk_hist_group_member_roles_visibility CHECK (visibility IN ('internal', 'public')),
    CONSTRAINT chk_hist_group_member_roles_years      CHECK (ended_year IS NULL OR started_year IS NULL OR ended_year >= started_year)
);

CREATE INDEX IF NOT EXISTS idx_hist_group_member_roles_member
    ON hist_group_member_roles(hist_fansub_group_member_id);
CREATE INDEX IF NOT EXISTS idx_hist_group_member_roles_code
    ON hist_group_member_roles(role_code);
CREATE INDEX IF NOT EXISTS idx_hist_group_member_roles_status
    ON hist_group_member_roles(status);
