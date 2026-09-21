-- Migration 0170 rollback: entfernt die additiv hinzugefügte Ignore-Tabelle
-- vollständig (Index zuerst, dann die Tabelle).
DROP INDEX IF EXISTS uq_library_discovery_ignored_item;
DROP TABLE IF EXISTS library_discovery_ignored_items;
