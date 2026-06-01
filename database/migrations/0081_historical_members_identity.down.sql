DROP TABLE IF EXISTS member_claims;

ALTER TABLE members
    DROP COLUMN IF EXISTS noindex;
