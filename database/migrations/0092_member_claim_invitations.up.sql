CREATE TABLE IF NOT EXISTS member_claim_invitations (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
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
    CONSTRAINT chk_member_claim_invitations_status CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    CONSTRAINT chk_member_claim_invitations_token_hash_length CHECK (char_length(token_hash) = 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_claim_invitations_pending_member
    ON member_claim_invitations (member_id)
    WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_claim_invitations_token_hash
    ON member_claim_invitations (token_hash);

CREATE INDEX IF NOT EXISTS idx_member_claim_invitations_member_status
    ON member_claim_invitations (member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_claim_invitations_expires_at
    ON member_claim_invitations (expires_at);
