-- Migration 0145 rollback: Remove canonical member identity in dependency order and
-- restore the 0126-era public default with the preceding visibility vocabulary.

DROP TRIGGER IF EXISTS trg_members_public_slug_immutable ON members;
DROP FUNCTION IF EXISTS prevent_member_public_slug_update();

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_public_slug_reserved,
    DROP CONSTRAINT IF EXISTS chk_members_public_slug_non_numeric,
    DROP CONSTRAINT IF EXISTS chk_members_public_slug_canonical,
    DROP CONSTRAINT IF EXISTS uq_members_public_slug,
    DROP COLUMN IF EXISTS public_slug;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_profile_visibility;

ALTER TABLE members
    ALTER COLUMN profile_visibility SET DEFAULT 'public',
    ADD CONSTRAINT chk_members_profile_visibility
        CHECK (profile_visibility IN ('public', 'members_only'));
