ALTER TABLE member_claims
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS note;
