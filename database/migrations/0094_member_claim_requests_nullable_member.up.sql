ALTER TABLE member_claims
    ALTER COLUMN member_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_claim_requests_pending_user
    ON member_claims(app_user_id)
    WHERE member_id IS NULL
      AND claim_status = 'pending'
      AND app_user_id IS NOT NULL;
