DROP INDEX IF EXISTS uq_member_claim_requests_pending_user;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM member_claims WHERE member_id IS NULL) THEN
        RAISE EXCEPTION 'cannot restore member_claims.member_id NOT NULL while request rows exist';
    END IF;
END $$;

ALTER TABLE member_claims
    ALTER COLUMN member_id SET NOT NULL;
