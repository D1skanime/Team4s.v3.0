-- Migration 0179 down: theme_types.kuerzel wieder entfernen.
ALTER TABLE theme_types DROP COLUMN IF EXISTS kuerzel;
