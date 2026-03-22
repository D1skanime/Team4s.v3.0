-- Migration 0027: Add media_types table and FK constraint to media_assets

CREATE TABLE media_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_media_type_name UNIQUE (name)
);

-- Add FK constraint to media_assets
ALTER TABLE media_assets
    ADD CONSTRAINT fk_media_assets_media_type
    FOREIGN KEY (media_type_id) REFERENCES media_types(id);
