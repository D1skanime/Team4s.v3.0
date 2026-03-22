-- Migration 0025: Add media_external table
-- Links media assets to external providers (e.g., Jellyfin, AniList, MAL)

CREATE TABLE media_external (
    id BIGSERIAL PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    external_type VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_media_external_provider UNIQUE (provider, external_id, external_type)
);

CREATE INDEX idx_media_external_media ON media_external(media_id);
CREATE INDEX idx_media_external_provider ON media_external(provider);
CREATE INDEX idx_media_external_external ON media_external(external_id);
