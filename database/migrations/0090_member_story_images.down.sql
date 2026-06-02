-- Rollback Migration 0090: Entfernt owner_member_id aus media_assets.

DROP INDEX IF EXISTS idx_media_assets_owner_member;

ALTER TABLE media_assets DROP COLUMN IF EXISTS owner_member_id;
