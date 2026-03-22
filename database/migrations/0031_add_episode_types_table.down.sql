-- Migration 0031 down: Remove episode_types lookup table

DROP INDEX IF EXISTS idx_episode_types_name;
DROP TABLE IF EXISTS episode_types;
