-- Migration 0165 DOWN:
-- Drops ONLY the new theme_segments.contributors_initialized_at marker column -- it never
-- deletes theme_segment_contributors rows. This is a deliberate CONTRAST to Migration 0164's
-- fully-no-op down: 0164 repaired existing rows in place (reverting it would restore a
-- proven-invalid state), whereas 0165 adds a NEW column, so dropping it is the correct, complete,
-- and safe revert of THIS migration's own schema change.
--
-- A theme_segment_contributors row inserted by up.sql's backfill is a REAL, saved selection
-- (156-UAT.md GAP-07 decision 1) -- exactly as if an admin had ticked it by hand -- not a display
-- artifact tied to the marker column's existence. Deleting it here would destroy real curated
-- data as a side effect of an unrelated schema-column revert.

BEGIN;

ALTER TABLE theme_segments DROP COLUMN IF EXISTS contributors_initialized_at;

COMMIT;
