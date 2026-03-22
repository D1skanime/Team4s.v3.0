-- Migration 0024: Recreate media_assets with new schema
-- Drops legacy media_assets table (only 2 rows) and creates new structure
-- FK constraints to MediaType and User will be added in future migration

-- Drop legacy table and its dependencies
ALTER TABLE IF EXISTS fansub_groups DROP CONSTRAINT IF EXISTS fansub_groups_banner_id_fkey;
ALTER TABLE IF EXISTS fansub_groups DROP CONSTRAINT IF EXISTS fansub_groups_logo_id_fkey;
DROP TABLE IF EXISTS media_assets CASCADE;

-- Create new media_assets table
CREATE TABLE media_assets (
    id BIGSERIAL PRIMARY KEY,
    media_type_id BIGINT,              -- FK to MediaType (added later)
    file_path TEXT NOT NULL,
    caption TEXT,
    mime_type VARCHAR(100) NOT NULL,
    format VARCHAR(50),
    uploaded_by BIGINT,                -- FK to User (added later)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by BIGINT                 -- FK to User (added later)
);

-- Index for media_type lookups
CREATE INDEX idx_media_asset_type ON media_assets(media_type_id);
