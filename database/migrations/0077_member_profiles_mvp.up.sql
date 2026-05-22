ALTER TABLE members
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(160),
    ADD COLUMN IF NOT EXISTS active_from_year INTEGER,
    ADD COLUMN IF NOT EXISTS active_until_year INTEGER,
    ADD COLUMN IF NOT EXISTS is_currently_active BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(32) NOT NULL DEFAULT 'members_only',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE members
SET display_name = nickname
WHERE (display_name IS NULL OR btrim(display_name) = '')
  AND btrim(nickname) <> '';

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_active_years;

ALTER TABLE members
    ADD CONSTRAINT chk_members_active_years
        CHECK (active_until_year IS NULL OR active_from_year IS NULL OR active_until_year >= active_from_year);

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_profile_visibility;

ALTER TABLE members
    ADD CONSTRAINT chk_members_profile_visibility
        CHECK (profile_visibility IN ('public', 'members_only'));

CREATE INDEX IF NOT EXISTS idx_members_profile_visibility
    ON members(profile_visibility);
