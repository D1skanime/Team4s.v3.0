-- Migration 0027 down: Remove media_types and FK constraint
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS fk_media_assets_media_type;
DROP TABLE IF EXISTS media_types CASCADE;
