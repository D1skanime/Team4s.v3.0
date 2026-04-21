-- Migration 0046: Drop legacy episode-version persistence.
-- Phase 20.1 intentionally discards disposable local episode-version test data
-- after the DB Schema v2 release graph exists.

DROP TABLE IF EXISTS episode_version_episodes;
DROP TABLE IF EXISTS episode_version_images;
DROP TABLE IF EXISTS episode_versions;
