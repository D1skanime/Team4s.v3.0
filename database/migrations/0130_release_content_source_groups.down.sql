DROP INDEX IF EXISTS idx_rvn_release_version_source_group;
DROP INDEX IF EXISTS idx_rvm_release_version_source_group;
ALTER TABLE release_version_notes DROP COLUMN IF EXISTS fansub_group_id;
ALTER TABLE release_version_media DROP COLUMN IF EXISTS fansub_group_id;
