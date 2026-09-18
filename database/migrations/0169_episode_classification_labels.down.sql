-- Migration 0169 rollback: entfernt die additiv hinzugefügten Anzeigenamen-Spalten.
ALTER TABLE episode_types DROP COLUMN IF EXISTS label;
ALTER TABLE episode_filler_types DROP COLUMN IF EXISTS label;
