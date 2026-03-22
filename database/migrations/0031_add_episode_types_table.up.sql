-- Migration 0031: Add episode_types lookup table (Phase B)
-- Normalizes episode types for better categorization

CREATE TABLE episode_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_episode_type_name UNIQUE (name)
);

-- Seed with common episode types
INSERT INTO episode_types (name) VALUES
    ('episode'),      -- Regular episode
    ('special'),      -- Special episode (OVA-like)
    ('ova'),          -- Original Video Animation
    ('ona'),          -- Original Net Animation
    ('movie'),        -- Movie/Film
    ('recap'),        -- Recap episode
    ('preview'),      -- Preview/Trailer
    ('prologue'),     -- Prologue episode
    ('epilogue'),     -- Epilogue episode
    ('bonus')         -- Bonus content
ON CONFLICT (name) DO NOTHING;

CREATE INDEX idx_episode_types_name ON episode_types(name);

COMMENT ON TABLE episode_types IS 'Lookup table for episode types (regular, special, OVA, etc.)';
