-- Migration 0082: Historical fansub group membership — member-based (not app-user-based).
-- Distinct from fansub_group_members (0073) which is app-user-backed.

CREATE TABLE IF NOT EXISTS hist_fansub_group_members (
    id               BIGSERIAL PRIMARY KEY,
    fansub_group_id  BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    member_id        BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    joined_year      INT NULL,
    left_year        INT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'historical',
    visibility       VARCHAR(20) NOT NULL DEFAULT 'internal',
    created_by       BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hist_fansub_group_members_group_member UNIQUE (fansub_group_id, member_id),
    CONSTRAINT chk_hist_fansub_group_members_status CHECK (status IN ('draft', 'historical', 'confirmed', 'disputed')),
    CONSTRAINT chk_hist_fansub_group_members_visibility CHECK (visibility IN ('internal', 'public')),
    CONSTRAINT chk_hist_fansub_group_members_years CHECK (left_year IS NULL OR joined_year IS NULL OR left_year >= joined_year)
);

CREATE INDEX IF NOT EXISTS idx_hist_fansub_group_members_group
    ON hist_fansub_group_members(fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_hist_fansub_group_members_member
    ON hist_fansub_group_members(member_id);
CREATE INDEX IF NOT EXISTS idx_hist_fansub_group_members_status
    ON hist_fansub_group_members(status);
CREATE INDEX IF NOT EXISTS idx_hist_fansub_group_members_visibility
    ON hist_fansub_group_members(visibility);
