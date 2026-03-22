-- Migration 0029: Add cover media type

INSERT INTO media_types (name) VALUES ('cover')
ON CONFLICT (name) DO NOTHING;
