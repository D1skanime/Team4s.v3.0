-- Migration 0030: Add anime_types lookup table (Phase A completion)
-- Normalizes anime_type enum to a lookup table for better extensibility

CREATE TABLE anime_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_anime_type_name UNIQUE (name)
);

-- Seed with existing enum values
INSERT INTO anime_types (name) VALUES
    ('tv'),
    ('film'),
    ('ova'),
    ('ona'),
    ('special'),
    ('bonus'),
    ('web')
ON CONFLICT (name) DO NOTHING;

-- Create index for name lookups
CREATE INDEX idx_anime_types_name ON anime_types(name);

COMMENT ON TABLE anime_types IS 'Lookup table for anime types (TV, Film, OVA, etc.)';
