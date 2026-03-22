-- Create media_assets table
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('image', 'video')),
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CHECK (entity_type IN ('anime', 'episode', 'fansub', 'release', 'user', 'member')),
    CHECK (asset_type IN ('poster', 'banner', 'logo', 'avatar', 'gallery', 'karaoke'))
);

CREATE INDEX idx_media_assets_entity ON media_assets(entity_type, entity_id);
CREATE INDEX idx_media_assets_asset_type ON media_assets(asset_type);
CREATE INDEX idx_media_assets_created_at ON media_assets(created_at);

-- Create media_files table
CREATE TABLE IF NOT EXISTS media_files (
    id BIGSERIAL PRIMARY KEY,
    media_id VARCHAR(36) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    variant VARCHAR(20) NOT NULL CHECK (variant IN ('original', 'thumb')),
    path TEXT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    size BIGINT NOT NULL,

    UNIQUE(media_id, variant)
);

CREATE INDEX idx_media_files_media_id ON media_files(media_id);

-- Create join tables
CREATE TABLE IF NOT EXISTS anime_media (
    anime_id BIGINT NOT NULL,
    media_id VARCHAR(36) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,

    PRIMARY KEY (anime_id, media_id)
);

CREATE INDEX idx_anime_media_anime_id ON anime_media(anime_id);
CREATE INDEX idx_anime_media_media_id ON anime_media(media_id);

CREATE TABLE IF NOT EXISTS episode_media (
    episode_id BIGINT NOT NULL,
    media_id VARCHAR(36) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,

    PRIMARY KEY (episode_id, media_id)
);

CREATE INDEX idx_episode_media_episode_id ON episode_media(episode_id);
CREATE INDEX idx_episode_media_media_id ON episode_media(media_id);

CREATE TABLE IF NOT EXISTS fansub_group_media (
    group_id BIGINT NOT NULL,
    media_id VARCHAR(36) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,

    PRIMARY KEY (group_id, media_id)
);

CREATE INDEX idx_fansub_group_media_group_id ON fansub_group_media(group_id);
CREATE INDEX idx_fansub_group_media_media_id ON fansub_group_media(media_id);

CREATE TABLE IF NOT EXISTS release_media (
    release_id BIGINT NOT NULL,
    media_id VARCHAR(36) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,

    PRIMARY KEY (release_id, media_id)
);

CREATE INDEX idx_release_media_release_id ON release_media(release_id);
CREATE INDEX idx_release_media_media_id ON release_media(media_id);
