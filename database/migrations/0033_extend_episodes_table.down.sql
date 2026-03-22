-- Migration 0033 down: Remove Phase B columns from episodes

DROP INDEX IF EXISTS idx_episodes_type;
DROP INDEX IF EXISTS idx_episodes_sort;

ALTER TABLE episodes DROP COLUMN IF EXISTS sort_index;
ALTER TABLE episodes DROP COLUMN IF EXISTS number_decimal;
ALTER TABLE episodes DROP COLUMN IF EXISTS number;
ALTER TABLE episodes DROP COLUMN IF EXISTS episode_type_id;
