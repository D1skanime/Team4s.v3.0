ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_active_date_range;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_active_dates_year_limited;

ALTER TABLE members
    DROP COLUMN IF EXISTS active_until_date,
    DROP COLUMN IF EXISTS active_from_date;
