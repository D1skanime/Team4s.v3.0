-- Migration 0026: Add media file and junction tables
-- Links media assets to anime, episodes, fansub groups, and releases

-- MediaFile - file variants of media assets
CREATE TABLE media_files (
    id BIGSERIAL PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    variant VARCHAR(50),
    storage_id VARCHAR(255),
    path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_file_media ON media_files(media_id);
CREATE INDEX idx_media_file_storage ON media_files(storage_id);

-- AnimeMedia - junction table
CREATE TABLE anime_media (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, media_id)
);

CREATE INDEX idx_anime_media_anime ON anime_media(anime_id);
CREATE INDEX idx_anime_media_media ON anime_media(media_id);

-- EpisodeMedia - junction table
CREATE TABLE episode_media (
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (episode_id, media_id)
);

CREATE INDEX idx_episode_media_episode ON episode_media(episode_id);
CREATE INDEX idx_episode_media_media ON episode_media(media_id);

-- FansubGroupMedia - junction table
CREATE TABLE fansub_group_media (
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, media_id)
);

CREATE INDEX idx_fansub_group_media_group ON fansub_group_media(group_id);
CREATE INDEX idx_fansub_group_media_media ON fansub_group_media(media_id);

-- ReleaseMedia - junction table (FK to fansub_releases added later)
CREATE TABLE release_media (
    release_id BIGINT NOT NULL,  -- FK to FansubRelease (added later)
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_id, media_id)
);

CREATE INDEX idx_release_media_release ON release_media(release_id);
CREATE INDEX idx_release_media_media ON release_media(media_id);
