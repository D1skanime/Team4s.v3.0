-- Migration 0081: Historical member identity — noindex flag and member_claims table.

-- noindex steuert Suchmaschinenindexierung des Member-Profils (Standard: nicht indexieren)
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS noindex BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS member_claims (
    id              BIGSERIAL PRIMARY KEY,
    member_id       BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    app_user_id     BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    claim_status    VARCHAR(20) NOT NULL DEFAULT 'pending',
    verification_method TEXT NULL,
    verified_by     BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    verified_at     TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_claims_member_user UNIQUE (member_id, app_user_id),
    CONSTRAINT chk_member_claims_status CHECK (claim_status IN ('pending', 'verified', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_member_claims_member_id
    ON member_claims(member_id);
CREATE INDEX IF NOT EXISTS idx_member_claims_app_user_id
    ON member_claims(app_user_id);
CREATE INDEX IF NOT EXISTS idx_member_claims_status
    ON member_claims(claim_status);
