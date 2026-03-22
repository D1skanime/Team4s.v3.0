-- Migration 0036 down: Remove backfilled data

ALTER TABLE episode_versions DROP COLUMN IF EXISTS fansub_release_id;

-- Clear backfilled data (in reverse order of creation)
DELETE FROM release_version_groups;
DELETE FROM streams;
DELETE FROM release_variants;
DELETE FROM release_versions;
DELETE FROM fansub_releases;
