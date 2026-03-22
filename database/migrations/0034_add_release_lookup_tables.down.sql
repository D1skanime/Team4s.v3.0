-- Migration 0034 down: Remove release lookup tables

DROP INDEX IF EXISTS idx_release_sources_type;
DROP TABLE IF EXISTS release_sources;
DROP TABLE IF EXISTS visibility_levels;
DROP TABLE IF EXISTS stream_types;
