-- Migration 0187 (down): Rueckbau der Hinweis-Tabelle fansub_group_hints. Alle Indizes
-- (inkl. des Partial-Unique-Index fuer den Spam-Schutz) werden automatisch mit der
-- Tabelle entfernt.
DROP TABLE IF EXISTS fansub_group_hints;
