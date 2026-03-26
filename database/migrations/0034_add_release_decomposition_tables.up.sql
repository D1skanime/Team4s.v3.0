-- Migration 0034: Add release decomposition tables (Phase C, step 1)
-- Additive schema only. No backfill or cutover in this migration.

CREATE TABLE IF NOT EXISTS release_sources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_release_sources_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_release_sources_type ON release_sources(type);

CREATE TABLE IF NOT EXISTS fansub_releases (
    id BIGSERIAL PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    source_id BIGINT REFERENCES release_sources(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fansub_releases_episode_id ON fansub_releases(episode_id);
CREATE INDEX IF NOT EXISTS idx_fansub_releases_source_id ON fansub_releases(source_id);

CREATE TABLE IF NOT EXISTS release_versions (
    id BIGSERIAL PRIMARY KEY,
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE,
    version VARCHAR(80) NOT NULL,
    legacy_episode_version_id BIGINT UNIQUE,
    release_date TIMESTAMPTZ,
    title VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_release_versions_release_version UNIQUE (release_id, version)
);

CREATE INDEX IF NOT EXISTS idx_release_versions_release_id ON release_versions(release_id);
CREATE INDEX IF NOT EXISTS idx_release_versions_release_date ON release_versions(release_date);

CREATE TABLE IF NOT EXISTS release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_version_id, fansub_group_id)
);

CREATE INDEX IF NOT EXISTS idx_release_version_groups_group_id ON release_version_groups(fansub_group_id);

CREATE TABLE IF NOT EXISTS release_variants (
    id BIGSERIAL PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    container VARCHAR(32),
    resolution VARCHAR(32),
    video_codec VARCHAR(64),
    audio_codec VARCHAR(64),
    subtitle_type VARCHAR(20),
    video_quality VARCHAR(20),
    file_size_bytes BIGINT,
    filename VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_release_variants_subtitle_type
        CHECK (subtitle_type IS NULL OR subtitle_type IN ('hardsub', 'softsub')),
    CONSTRAINT uq_release_variants_version_filename UNIQUE (release_version_id, filename)
);

CREATE INDEX IF NOT EXISTS idx_release_variants_release_version_id ON release_variants(release_version_id);

CREATE TABLE IF NOT EXISTS stream_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stream_types_name UNIQUE (name)
);

INSERT INTO stream_types (name) VALUES
    ('episode'),
    ('preview')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS visibilities (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_visibilities_name UNIQUE (name)
);

INSERT INTO visibilities (name) VALUES
    ('public'),
    ('registered'),
    ('fansubber'),
    ('staff'),
    ('private')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS stream_sources (
    id BIGSERIAL PRIMARY KEY,
    provider_type VARCHAR(40) NOT NULL,
    external_id VARCHAR(255),
    url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stream_sources_provider_external UNIQUE NULLS NOT DISTINCT (provider_type, external_id),
    CONSTRAINT chk_stream_sources_provider_type
        CHECK (provider_type IN ('jellyfin', 'youtube', 'vimeo', 'direct')),
    CONSTRAINT chk_stream_sources_external_or_url
        CHECK (NULLIF(BTRIM(COALESCE(external_id, '')), '') IS NOT NULL OR NULLIF(BTRIM(COALESCE(url, '')), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_stream_sources_provider_type ON stream_sources(provider_type);
CREATE INDEX IF NOT EXISTS idx_stream_sources_external_id ON stream_sources(external_id);

CREATE TABLE IF NOT EXISTS release_streams (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL REFERENCES release_variants(id) ON DELETE CASCADE,
    stream_type_id BIGINT NOT NULL REFERENCES stream_types(id),
    stream_source_id BIGINT NOT NULL REFERENCES stream_sources(id) ON DELETE CASCADE,
    jellyfin_item_id VARCHAR(255),
    subtitle_language_id BIGINT REFERENCES languages(id) ON DELETE SET NULL,
    audio_language_id BIGINT REFERENCES languages(id) ON DELETE SET NULL,
    visibility_id BIGINT REFERENCES visibilities(id) ON DELETE SET NULL,
    legacy_episode_version_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_release_streams_variant_type_lang UNIQUE (variant_id, stream_type_id, audio_language_id, subtitle_language_id)
);

CREATE INDEX IF NOT EXISTS idx_release_streams_variant_id ON release_streams(variant_id);
CREATE INDEX IF NOT EXISTS idx_release_streams_stream_source_id ON release_streams(stream_source_id);
CREATE INDEX IF NOT EXISTS idx_release_streams_jellyfin_item_id ON release_streams(jellyfin_item_id);

COMMENT ON TABLE fansub_releases IS 'Normalized release identity layer introduced in Phase C.';
COMMENT ON COLUMN release_versions.legacy_episode_version_id IS 'Optional pointer to the legacy episode_versions row used during Phase C transition.';
COMMENT ON COLUMN release_streams.legacy_episode_version_id IS 'Optional pointer to the legacy episode_versions row for transitional stream parity.';
