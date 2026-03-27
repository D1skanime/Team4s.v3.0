-- Migration 0037: Normalize the release-decomposition schema on top of the
-- already-applied lookup/release table path.
--
-- Local databases already carry the older 0034/0035 release schema
-- (`add_release_lookup_tables`, `add_release_tables`, `backfill_releases...`).
-- Keep this migration additive and idempotent so later migrations can proceed.

ALTER TABLE release_sources
    ADD COLUMN IF NOT EXISTS type VARCHAR(40);

UPDATE release_sources
SET type = COALESCE(
    NULLIF(BTRIM(type), ''),
    NULLIF(BTRIM(source_type), ''),
    LOWER(NULLIF(BTRIM(name), ''))
)
WHERE type IS NULL OR BTRIM(type) = '';

CREATE INDEX IF NOT EXISTS idx_release_sources_type ON release_sources(type);

ALTER TABLE fansub_releases
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE release_versions
    ADD COLUMN IF NOT EXISTS legacy_episode_version_id BIGINT,
    ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_release_versions_release_version'
    ) THEN
        ALTER TABLE release_versions
            ADD CONSTRAINT uq_release_versions_release_version UNIQUE (release_id, version);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_release_versions_release_id ON release_versions(release_id);
CREATE INDEX IF NOT EXISTS idx_release_versions_release_date ON release_versions(release_date);

ALTER TABLE release_variants
    ADD COLUMN IF NOT EXISTS subtitle_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS video_quality VARCHAR(20),
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_release_variants_subtitle_type'
    ) THEN
        ALTER TABLE release_variants
            ADD CONSTRAINT chk_release_variants_subtitle_type
            CHECK (subtitle_type IS NULL OR subtitle_type IN ('hardsub', 'softsub'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_release_variants_release_version_id
    ON release_variants(release_version_id);

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
        CHECK (
            NULLIF(BTRIM(COALESCE(external_id, '')), '') IS NOT NULL
            OR NULLIF(BTRIM(COALESCE(url, '')), '') IS NOT NULL
        )
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
    CONSTRAINT uq_release_streams_variant_type_lang UNIQUE (
        variant_id,
        stream_type_id,
        audio_language_id,
        subtitle_language_id
    )
);

CREATE INDEX IF NOT EXISTS idx_release_streams_variant_id ON release_streams(variant_id);
CREATE INDEX IF NOT EXISTS idx_release_streams_stream_source_id ON release_streams(stream_source_id);
CREATE INDEX IF NOT EXISTS idx_release_streams_jellyfin_item_id ON release_streams(jellyfin_item_id);
