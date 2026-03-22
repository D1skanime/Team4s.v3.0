-- Migration 0035: Add core release tables (Phase C)
-- Decomposes episode_versions into normalized structure

-- FansubRelease: A release of an episode by fansub group(s)
CREATE TABLE fansub_releases (
    id BIGSERIAL PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    source_id BIGINT REFERENCES release_sources(id),
    release_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by BIGINT
);

CREATE INDEX idx_fansub_releases_episode ON fansub_releases(episode_id);
CREATE INDEX idx_fansub_releases_source ON fansub_releases(source_id);
CREATE INDEX idx_fansub_releases_date ON fansub_releases(release_date);

-- ReleaseVersion: Version of a release (v1, v2, batch, etc.)
CREATE TABLE release_versions (
    id BIGSERIAL PRIMARY KEY,
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by BIGINT,
    CONSTRAINT uq_release_version UNIQUE (release_id, version)
);

CREATE INDEX idx_release_versions_release ON release_versions(release_id);

-- ReleaseVariant: Technical variant (resolution, codec, etc.)
CREATE TABLE release_variants (
    id BIGSERIAL PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    container VARCHAR(20),           -- mkv, mp4, avi
    resolution VARCHAR(20),          -- 1080p, 720p, 480p
    video_codec VARCHAR(50),         -- x264, x265, av1
    audio_codec VARCHAR(50),         -- aac, flac, opus
    file_size BIGINT,
    filename VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by BIGINT
);

CREATE INDEX idx_release_variants_version ON release_variants(release_version_id);

-- Stream: Actual streaming source for a variant
CREATE TABLE streams (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL REFERENCES release_variants(id) ON DELETE CASCADE,
    stream_type_id BIGINT NOT NULL REFERENCES stream_types(id),
    provider_type VARCHAR(50) NOT NULL,  -- jellyfin, youtube, direct
    external_id VARCHAR(255),            -- jellyfin item id, youtube video id
    stream_url TEXT,
    subtitle_language_id BIGINT REFERENCES languages(id),
    audio_language_id BIGINT REFERENCES languages(id),
    visibility_id BIGINT REFERENCES visibility_levels(id),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by BIGINT
);

CREATE INDEX idx_streams_variant ON streams(variant_id);
CREATE INDEX idx_streams_type ON streams(stream_type_id);
CREATE INDEX idx_streams_provider ON streams(provider_type);
CREATE INDEX idx_streams_external ON streams(external_id);

-- ReleaseVersionGroup: Junction table for fansub groups per version
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_version_id, fansub_group_id)
);

CREATE INDEX idx_release_version_groups_version ON release_version_groups(release_version_id);
CREATE INDEX idx_release_version_groups_group ON release_version_groups(fansub_group_id);

COMMENT ON TABLE fansub_releases IS 'A fansub release of an episode';
COMMENT ON TABLE release_versions IS 'Version of a release (v1, v2, batch)';
COMMENT ON TABLE release_variants IS 'Technical variant (resolution, codec)';
COMMENT ON TABLE streams IS 'Streaming sources for variants';
COMMENT ON TABLE release_version_groups IS 'Fansub groups participating in a release version';
