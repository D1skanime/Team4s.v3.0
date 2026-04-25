-- Migration 0044 seeded theme_types with 'opening', 'ending', 'insert_song'.
-- These generic names are replaced with the specific operational labels for Phase 23.
-- The themes table is empty (no production data) so this replacement is safe.
DELETE FROM theme_types WHERE name IN ('opening', 'ending', 'insert_song');

INSERT INTO theme_types (name) VALUES
    ('OP1'),
    ('OP2'),
    ('ED1'),
    ('ED2'),
    ('Insert'),
    ('Outro')
ON CONFLICT (name) DO NOTHING;
