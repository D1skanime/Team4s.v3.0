ALTER TABLE members
    ADD COLUMN IF NOT EXISTS active_from_date DATE,
    ADD COLUMN IF NOT EXISTS active_until_date DATE;

UPDATE members
SET active_from_date = make_date(active_from_year, 1, 1)
WHERE active_from_date IS NULL
  AND active_from_year BETWEEN 1970 AND 2100;

UPDATE members
SET active_until_date = make_date(active_until_year, 1, 1)
WHERE active_until_date IS NULL
  AND active_until_year BETWEEN 1970 AND 2100;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_active_dates_year_limited;

ALTER TABLE members
    ADD CONSTRAINT chk_members_active_dates_year_limited
        CHECK (
            (
                active_from_date IS NULL
                OR (
                    EXTRACT(MONTH FROM active_from_date) = 1
                    AND EXTRACT(DAY FROM active_from_date) = 1
                    AND EXTRACT(YEAR FROM active_from_date)::int BETWEEN 1970 AND 2100
                )
            )
            AND (
                active_until_date IS NULL
                OR (
                    EXTRACT(MONTH FROM active_until_date) = 1
                    AND EXTRACT(DAY FROM active_until_date) = 1
                    AND EXTRACT(YEAR FROM active_until_date)::int BETWEEN 1970 AND 2100
                )
            )
        );

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_active_date_range;

ALTER TABLE members
    ADD CONSTRAINT chk_members_active_date_range
        CHECK (active_until_date IS NULL OR active_from_date IS NULL OR active_until_date >= active_from_date);
