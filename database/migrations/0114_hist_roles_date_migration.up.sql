-- Migration 0114: Historische Rollen- und Mitgliedschaftszeitraeume auf DATE-Spalten umstellen.
-- Kritische Reihenfolge: Constraints droppen VOR Spalten-Drop.
-- CHECK-Constraints, die Spalten referenzieren, erst via DROP CONSTRAINT entfernen.

BEGIN;

-- Schritt 1: Neue DATE-Spalten in hist_group_member_roles anlegen.
ALTER TABLE hist_group_member_roles
    ADD COLUMN IF NOT EXISTS started_date DATE NULL,
    ADD COLUMN IF NOT EXISTS ended_date   DATE NULL;

-- Schritt 2: Bestandsdaten aus Jahreswerten auf den 1. Januar mappen.
UPDATE hist_group_member_roles
SET started_date = MAKE_DATE(started_year, 1, 1)
WHERE started_year IS NOT NULL;

UPDATE hist_group_member_roles
SET ended_date = MAKE_DATE(ended_year, 1, 1)
WHERE ended_year IS NOT NULL;

-- Schritt 3: Alten Jahres-Constraint entfernen, neuen DATE-Constraint anlegen.
ALTER TABLE hist_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_hist_group_member_roles_years,
    ADD CONSTRAINT chk_hist_group_member_roles_dates
        CHECK (ended_date IS NULL OR started_date IS NULL OR ended_date >= started_date);

-- Schritt 4: Alte Jahres-Spalten erst nach Constraint-Drop entfernen.
ALTER TABLE hist_group_member_roles
    DROP COLUMN IF EXISTS started_year,
    DROP COLUMN IF EXISTS ended_year;

-- Schritt 5: Neue DATE-Spalten in hist_fansub_group_members anlegen.
ALTER TABLE hist_fansub_group_members
    ADD COLUMN IF NOT EXISTS joined_date DATE NULL,
    ADD COLUMN IF NOT EXISTS left_date   DATE NULL;

-- Schritt 6: Bestandsdaten aus Jahreswerten auf den 1. Januar mappen.
UPDATE hist_fansub_group_members
SET joined_date = MAKE_DATE(joined_year, 1, 1)
WHERE joined_year IS NOT NULL;

UPDATE hist_fansub_group_members
SET left_date = MAKE_DATE(left_year, 1, 1)
WHERE left_year IS NOT NULL;

-- Schritt 7: Alten Jahres-Constraint entfernen, neuen DATE-Constraint anlegen.
ALTER TABLE hist_fansub_group_members
    DROP CONSTRAINT IF EXISTS chk_hist_fansub_group_members_years,
    ADD CONSTRAINT chk_hist_fansub_group_members_dates
        CHECK (left_date IS NULL OR joined_date IS NULL OR left_date >= joined_date);

-- Schritt 8: Alte Jahres-Spalten erst nach Constraint-Drop entfernen.
ALTER TABLE hist_fansub_group_members
    DROP COLUMN IF EXISTS joined_year,
    DROP COLUMN IF EXISTS left_year;

COMMIT;
