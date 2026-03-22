-- Drop join tables first (due to foreign keys)
DROP TABLE IF EXISTS release_media;
DROP TABLE IF EXISTS fansub_group_media;
DROP TABLE IF EXISTS episode_media;
DROP TABLE IF EXISTS anime_media;

-- Drop media_files table
DROP TABLE IF EXISTS media_files;

-- Drop media_assets table
DROP TABLE IF EXISTS media_assets;
