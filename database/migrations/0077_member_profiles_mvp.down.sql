DROP INDEX IF EXISTS idx_members_profile_visibility;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_profile_visibility;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_active_years;

ALTER TABLE members
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS profile_visibility,
    DROP COLUMN IF EXISTS is_currently_active,
    DROP COLUMN IF EXISTS active_until_year,
    DROP COLUMN IF EXISTS active_from_year,
    DROP COLUMN IF EXISTS display_name;
