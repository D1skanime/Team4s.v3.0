-- Migration 0028: Seed media_types with standard values

INSERT INTO media_types (name) VALUES
    ('poster'),
    ('banner'),
    ('background'),
    ('logo'),
    ('preview'),
    ('screenshot'),
    ('avatar'),
    ('thumbnail'),
    ('karaoke_background'),
    ('video')
ON CONFLICT (name) DO NOTHING;
