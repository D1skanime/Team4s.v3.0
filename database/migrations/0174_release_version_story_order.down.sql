DROP TABLE IF EXISTS release_version_story_order;
ALTER TABLE release_version_media
    DROP CONSTRAINT IF EXISTS uq_release_version_media_id_version;
