-- Migration 0060: Seed media_types with the generic image type used by release-version media assets

INSERT INTO media_types (name) VALUES ('image')
ON CONFLICT (name) DO NOTHING;
