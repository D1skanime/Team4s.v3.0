-- Migration 0030 down: Remove anime_types lookup table

DROP INDEX IF EXISTS idx_anime_types_name;
DROP TABLE IF EXISTS anime_types;
