CREATE TABLE IF NOT EXISTS fansub_group_invitations (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    normalized_email TEXT NOT NULL,
    invited_role_codes TEXT[] NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    cancelled_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fansub_group_invitations_status CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    CONSTRAINT chk_fansub_group_invitations_roles_nonempty CHECK (COALESCE(array_length(invited_role_codes, 1), 0) > 0),
    CONSTRAINT chk_fansub_group_invitations_token_hash_length CHECK (char_length(token_hash) = 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fansub_group_invitations_pending_email
    ON fansub_group_invitations (fansub_group_id, normalized_email)
    WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fansub_group_invitations_token_hash
    ON fansub_group_invitations (token_hash);

CREATE INDEX IF NOT EXISTS idx_fansub_group_invitations_group_status
    ON fansub_group_invitations (fansub_group_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fansub_group_invitations_expires_at
    ON fansub_group_invitations (expires_at);
