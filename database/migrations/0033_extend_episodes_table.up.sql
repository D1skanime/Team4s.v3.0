-- Migration 0033: Extend episodes table with Phase B columns
-- Adds normalized episode number fields and type reference

-- Add episode_type_id column with FK to episode_types
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS episode_type_id BIGINT REFERENCES episode_types(id);

-- Add normalized number columns
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS number INTEGER;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS number_decimal DECIMAL(5,1);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS sort_index INTEGER;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_episodes_sort ON episodes(anime_id, sort_index);
CREATE INDEX IF NOT EXISTS idx_episodes_type ON episodes(episode_type_id);

-- Set default episode_type_id to 'episode' (id=1) for existing rows
UPDATE episodes SET episode_type_id = 1 WHERE episode_type_id IS NULL;

-- Parse episode_number to number column where possible
UPDATE episodes
SET number = CAST(episode_number AS INTEGER)
WHERE episode_number ~ '^\d+$' AND number IS NULL;

-- Set sort_index based on number or episode_number
UPDATE episodes
SET sort_index = COALESCE(number,
    CASE WHEN episode_number ~ '^\d+'
         THEN CAST(SUBSTRING(episode_number FROM '^\d+') AS INTEGER)
         ELSE 9999
    END)
WHERE sort_index IS NULL;

COMMENT ON COLUMN episodes.episode_type_id IS 'FK to episode_types (episode, special, ova, etc.)';
COMMENT ON COLUMN episodes.number IS 'Numeric episode number (NULL for specials like "OVA")';
COMMENT ON COLUMN episodes.number_decimal IS 'Decimal for episodes like 13.5';
COMMENT ON COLUMN episodes.sort_index IS 'Sort order within anime';
