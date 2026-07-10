-- Migration 0124: Historical group member roles are public by default.
-- Rationale: historical members must surface their role on the public group page
-- (parity with active member roles, which have no visibility gate). The prior
-- 'internal' default silently hid every newly recorded historical role.
-- An admin can still explicitly hide a single role by setting visibility='internal'.

ALTER TABLE hist_group_member_roles
    ALTER COLUMN visibility SET DEFAULT 'public';

-- Backfill: existing rows were all created under the old 'internal' default and
-- were never meant to be hidden; publish them so recorded roles become visible.
UPDATE hist_group_member_roles
    SET visibility = 'public'
    WHERE visibility = 'internal';
