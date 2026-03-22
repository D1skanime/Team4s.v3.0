-- Migration 0034: Add release-related lookup tables (Phase C)
-- Prerequisites for the release decomposition

-- Stream types (episode, preview)
CREATE TABLE stream_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stream_type_name UNIQUE (name)
);

INSERT INTO stream_types (name) VALUES
    ('episode'),
    ('preview'),
    ('trailer')
ON CONFLICT (name) DO NOTHING;

-- Visibility levels
CREATE TABLE visibility_levels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_visibility_name UNIQUE (name)
);

INSERT INTO visibility_levels (name, sort_order) VALUES
    ('public', 1),
    ('registered', 2),
    ('fansubber', 3),
    ('staff', 4),
    ('private', 5)
ON CONFLICT (name) DO NOTHING;

-- Release sources (jellyfin, youtube, direct, etc.)
CREATE TABLE release_sources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- jellyfin, youtube, vimeo, direct
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_release_source_name UNIQUE (name)
);

INSERT INTO release_sources (name, source_type) VALUES
    ('Jellyfin', 'jellyfin'),
    ('YouTube', 'youtube'),
    ('Vimeo', 'vimeo'),
    ('Direct', 'direct'),
    ('Legacy', 'legacy')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX idx_release_sources_type ON release_sources(source_type);

COMMENT ON TABLE stream_types IS 'Types of streams (episode, preview, trailer)';
COMMENT ON TABLE visibility_levels IS 'Access control levels for content';
COMMENT ON TABLE release_sources IS 'Media providers/sources for streams';
