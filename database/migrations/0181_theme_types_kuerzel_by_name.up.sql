-- Migration 0181: re-derive theme_types.kuerzel by NAME instead of by hardcoded id
-- (WR-01, 176-REVIEW). Migration 0179 already set kuerzel correctly for every
-- environment that applied every migration in the documented order (verified via
-- live psql against this environment's theme_types table), so 0179 itself is NOT
-- edited here -- it already ran against the live dev database and editing an
-- applied migration in place is not safe.
--
-- This migration is a defensive, idempotent follow-up: it re-applies the exact same
-- mapping keyed on the theme_type's current NAME rather than its numeric id. The
-- names are 'OP Kara' / 'ED Kara' / 'Insert Kara' / 'Outro' -- migration 0058
-- ("Umbenennung der Theme-Typen") renamed the original 'OP'/'ED'/'Insert' seeded by
-- 0048/0050 to their "... Kara" forms; 'Outro' was never renamed. Re-running this
-- migration is always a no-op if kuerzel already matches; it only changes a row if
-- some future drift (a manually reseeded dev/staging DB, an out-of-order migration
-- replay, or a new theme_types row inserted with an unexpected id before 0179 ran)
-- ever caused the id-keyed 0179 UPDATEs to land on the wrong row. No new rows are
-- inserted and no existing kuerzel for a name outside this known set is touched.
UPDATE theme_types SET kuerzel = 'OP' WHERE name = 'OP Kara' AND kuerzel IS DISTINCT FROM 'OP';
UPDATE theme_types SET kuerzel = 'ED' WHERE name = 'ED Kara' AND kuerzel IS DISTINCT FROM 'ED';
UPDATE theme_types SET kuerzel = 'IN' WHERE name = 'Insert Kara' AND kuerzel IS DISTINCT FROM 'IN';
UPDATE theme_types SET kuerzel = 'OUT' WHERE name = 'Outro' AND kuerzel IS DISTINCT FROM 'OUT';
