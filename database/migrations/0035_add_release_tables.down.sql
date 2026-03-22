-- Migration 0035 down: Remove core release tables

DROP TABLE IF EXISTS release_version_groups;
DROP TABLE IF EXISTS streams;
DROP TABLE IF EXISTS release_variants;
DROP TABLE IF EXISTS release_versions;
DROP TABLE IF EXISTS fansub_releases;
