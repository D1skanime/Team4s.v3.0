ALTER TABLE members
    ADD COLUMN IF NOT EXISTS background_media_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL;
