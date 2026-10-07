-- Migration 0179: theme_types.kuerzel als fixe, DB-gehaltene Darstellungsform
-- (D-01, 176-CONTEXT.md). Ersetzt das bisherige Name-Guessing
-- (`theme_type_name.toUpperCase().includes('OP')` etc.) in der Segment-Badge-
-- Logik durch eine feste, enum-artige Spalte -- analog zum Muster aus
-- Migration 0171 (fansub_groups.kuerzel), hier aber ohne Unique-Index, da die
-- Werte fest seedbar sind (4 bekannte Zeilen) statt admin-gepflegte Freitext-
-- daten zu sein.
ALTER TABLE theme_types ADD COLUMN kuerzel VARCHAR(8);

UPDATE theme_types SET kuerzel = 'OP' WHERE id = 4;
UPDATE theme_types SET kuerzel = 'ED' WHERE id = 6;
UPDATE theme_types SET kuerzel = 'IN' WHERE id = 8;
UPDATE theme_types SET kuerzel = 'OUT' WHERE id = 9;

COMMENT ON COLUMN theme_types.kuerzel IS 'D-01: feste Kurzform (OP/ED/IN/OUT) fuer Badge-Label/Farbe/Upper-Spur-Klassifizierung im Segment-Editor; ersetzt Name-Guessing auf theme_type_name.';
