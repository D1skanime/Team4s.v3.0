-- Migration 0032 down: Remove episode_titles table

DROP INDEX IF EXISTS idx_episode_titles_language;
DROP INDEX IF EXISTS idx_episode_titles_episode;
DROP TABLE IF EXISTS episode_titles;
