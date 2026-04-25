DELETE FROM theme_types WHERE name IN ('OP1', 'OP2', 'ED1', 'ED2', 'Insert', 'Outro');

INSERT INTO theme_types (name) VALUES
    ('opening'),
    ('ending'),
    ('insert_song')
ON CONFLICT (name) DO NOTHING;
