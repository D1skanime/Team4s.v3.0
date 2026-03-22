-- Migration 0026 down: Remove media file and junction tables
DROP TABLE IF EXISTS release_media CASCADE;
DROP TABLE IF EXISTS fansub_group_media CASCADE;
DROP TABLE IF EXISTS episode_media CASCADE;
DROP TABLE IF EXISTS anime_media CASCADE;
DROP TABLE IF EXISTS media_files CASCADE;
