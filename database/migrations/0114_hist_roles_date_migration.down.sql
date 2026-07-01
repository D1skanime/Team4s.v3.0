-- Rollback Migration 0114: Historische Rollen- und Mitgliedschaftszeitraeume auf Jahres-Spalten zurueckfuehren.
-- Kritische Reihenfolge: Constraints droppen VOR Spalten-Drop.

BEGIN;

-- Schritt 1: Jahres-Spalten in hist_group_member_roles wiederherstellen.
ALTER TABLE hist_group_member_roles
    ADD COLUMN IF NOT EXISTS started_year INT NULL,
    ADD COLUMN IF NOT EXISTS ended_year   INT NULL;

UPDATE hist_group_member_roles
SET started_year = EXTRACT(YEAR FROM started_date)::INT
WHERE started_date IS NOT NULL;

UPDATE hist_group_member_roles
SET ended_year = EXTRACT(YEAR FROM ended_date)::INT
WHERE ended_date IS NOT NULL;

ALTER TABLE hist_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_hist_group_member_roles_dates,
    ADD CONSTRAINT chk_hist_group_member_roles_years
        CHECK (ended_year IS NULL OR started_year IS NULL OR ended_year >= started_year);

ALTER TABLE hist_group_member_roles
    DROP COLUMN IF EXISTS started_date,
    DROP COLUMN IF EXISTS ended_date;

-- Schritt 2: Jahres-Spalten in hist_fansub_group_members wiederherstellen.
ALTER TABLE hist_fansub_group_members
    ADD COLUMN IF NOT EXISTS joined_year INT NULL,
    ADD COLUMN IF NOT EXISTS left_year   INT NULL;

UPDATE hist_fansub_group_members
SET joined_year = EXTRACT(YEAR FROM joined_date)::INT
WHERE joined_date IS NOT NULL;

UPDATE hist_fansub_group_members
SET left_year = EXTRACT(YEAR FROM left_date)::INT
WHERE left_date IS NOT NULL;

ALTER TABLE hist_fansub_group_members
    DROP CONSTRAINT IF EXISTS chk_hist_fansub_group_members_dates,
    ADD CONSTRAINT chk_hist_fansub_group_members_years
        CHECK (left_year IS NULL OR joined_year IS NULL OR left_year >= joined_year);

ALTER TABLE hist_fansub_group_members
    DROP COLUMN IF EXISTS joined_date,
    DROP COLUMN IF EXISTS left_date;

COMMIT;
