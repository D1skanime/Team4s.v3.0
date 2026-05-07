-- Migration 0059 down: Revert release_version_media schema foundation

-- 3. Revert: status-Spalte aus media_files entfernen
DROP INDEX IF EXISTS idx_media_files_status;
ALTER TABLE media_files DROP CONSTRAINT IF EXISTS chk_media_files_status;
ALTER TABLE media_files DROP COLUMN IF EXISTS status;

-- 2. Revert: status-Spalte aus media_assets entfernen
DROP INDEX IF EXISTS idx_media_assets_status;
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS chk_media_assets_status;
ALTER TABLE media_assets DROP COLUMN IF EXISTS status;

-- 1. Revert: release_version_media-Tabelle droppen (Indexe werden kaskadierend gedroppt)
DROP TABLE IF EXISTS release_version_media;
