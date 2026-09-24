-- Migration 0171 rollback: entfernt die additiv hinzugefügten Kürzel-Spalten
-- vollständig (Index zuerst, dann die Spalten).
DROP INDEX IF EXISTS uq_fansub_groups_normalized_kuerzel;
ALTER TABLE fansub_groups DROP COLUMN IF EXISTS normalized_kuerzel;
ALTER TABLE fansub_groups DROP COLUMN IF EXISTS kuerzel;
