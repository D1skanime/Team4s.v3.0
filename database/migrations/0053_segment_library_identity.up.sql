-- Migration 0052: Add reusable segment library identity, assets, and assignments
-- Phase 27 establishes a stable AniSearch/group-based segment identity that can
-- survive local anime deletion and later be rebound after reimport.

CREATE TABLE IF NOT EXISTS segment_library_definitions (
    id BIGSERIAL PRIMARY KEY,
    anime_source_provider VARCHAR(40) NOT NULL,
    anime_source_external_id TEXT NOT NULL,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    segment_kind VARCHAR(40) NOT NULL,
    segment_name TEXT,
    normalized_segment_name TEXT NOT NULL DEFAULT '',
    identity_status VARCHAR(24) NOT NULL DEFAULT 'verified'
        CHECK (identity_status IN ('verified', 'legacy_unverified')),
    ownership_scope VARCHAR(24) NOT NULL DEFAULT 'reusable'
        CHECK (ownership_scope IN ('reusable', 'local_only')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_segment_library_definition_identity
    ON segment_library_definitions (
        anime_source_provider,
        anime_source_external_id,
        fansub_group_id,
        segment_kind,
        normalized_segment_name
    );

CREATE INDEX IF NOT EXISTS idx_segment_library_definition_anime_source
    ON segment_library_definitions (anime_source_provider, anime_source_external_id);

CREATE INDEX IF NOT EXISTS idx_segment_library_definition_group
    ON segment_library_definitions (fansub_group_id);

CREATE INDEX IF NOT EXISTS idx_segment_library_definition_scope
    ON segment_library_definitions (ownership_scope, identity_status);

CREATE TABLE IF NOT EXISTS segment_library_assets (
    id BIGSERIAL PRIMARY KEY,
    definition_id BIGINT NOT NULL REFERENCES segment_library_definitions(id) ON DELETE CASCADE,
    media_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
    source_ref TEXT NOT NULL,
    source_label TEXT,
    attach_source VARCHAR(24) NOT NULL DEFAULT 'migrated'
        CHECK (attach_source IN ('migrated', 'upload', 'reuse', 'manual_link')),
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_segment_library_asset_definition_ref
    ON segment_library_assets (definition_id, source_ref);

CREATE INDEX IF NOT EXISTS idx_segment_library_asset_media
    ON segment_library_assets (media_asset_id);

CREATE INDEX IF NOT EXISTS idx_segment_library_asset_primary
    ON segment_library_assets (definition_id, is_primary, id);

CREATE TABLE IF NOT EXISTS segment_library_assignments (
    id BIGSERIAL PRIMARY KEY,
    definition_id BIGINT NOT NULL REFERENCES segment_library_definitions(id) ON DELETE CASCADE,
    asset_id BIGINT REFERENCES segment_library_assets(id) ON DELETE SET NULL,
    anime_id BIGINT REFERENCES anime(id) ON DELETE SET NULL,
    theme_segment_id BIGINT REFERENCES theme_segments(id) ON DELETE SET NULL,
    release_version TEXT,
    attach_source VARCHAR(24) NOT NULL DEFAULT 'local_segment'
        CHECK (attach_source IN ('local_segment', 'reuse_attach', 'reimport_rebind', 'manual_link')),
    attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detached_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_segment_library_assignment_theme_segment
    ON segment_library_assignments (theme_segment_id)
    WHERE theme_segment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_segment_library_assignment_definition
    ON segment_library_assignments (definition_id, detached_at);

CREATE INDEX IF NOT EXISTS idx_segment_library_assignment_anime
    ON segment_library_assignments (anime_id, detached_at);
