-- Migration 0045: Reconcile DB Schema v2 documented columns, constraints, and indexes.
-- Compatibility columns remain until the explicit cleanup plan.

ALTER TABLE anime
    ADD COLUMN IF NOT EXISTS anime_type_id BIGINT REFERENCES anime_types(id),
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
    ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS modified_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

UPDATE anime a
SET anime_type_id = at.id
FROM anime_types at
WHERE a.anime_type_id IS NULL
    AND LOWER(at.name) = LOWER(a.type::text);

UPDATE anime
SET modified_at = COALESCE(modified_at, updated_at, created_at)
WHERE modified_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_anime_anisearch_id
    ON anime(anisearch_id)
    WHERE anisearch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_anime_slug
    ON anime(slug)
    WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anime_slug ON anime(slug);
CREATE INDEX IF NOT EXISTS idx_anime_type_id ON anime(anime_type_id);

ALTER TABLE episodes
    ADD COLUMN IF NOT EXISTS number_text TEXT,
    ADD COLUMN IF NOT EXISTS filler_type_id BIGINT REFERENCES episode_filler_types(id),
    ADD COLUMN IF NOT EXISTS filler_source VARCHAR(80),
    ADD COLUMN IF NOT EXISTS filler_note TEXT,
    ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS modified_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

UPDATE episodes
SET number_text = COALESCE(number_text, episode_number)
WHERE number_text IS NULL;

UPDATE episodes
SET modified_at = COALESCE(modified_at, updated_at, created_at)
WHERE modified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_episode_filler_type ON episodes(filler_type_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_episodes_anime_number_type
    ON episodes(anime_id, number, episode_type_id)
    WHERE number IS NOT NULL AND episode_type_id IS NOT NULL;

ALTER TABLE fansub_releases
    ADD COLUMN IF NOT EXISTS source BIGINT REFERENCES release_sources(id),
    ADD CONSTRAINT fk_fansub_releases_modified_by
        FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL;

UPDATE fansub_releases
SET source = COALESCE(source, source_id)
WHERE source IS NULL;

CREATE INDEX IF NOT EXISTS idx_release_episode ON fansub_releases(episode_id);
CREATE INDEX IF NOT EXISTS idx_release_source ON fansub_releases(source);

ALTER TABLE release_versions
    ADD CONSTRAINT fk_release_versions_modified_by
        FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE release_variants
    ADD CONSTRAINT fk_release_variants_modified_by
        FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_release_variant_filename'
    ) THEN
        ALTER TABLE release_variants
            ADD CONSTRAINT uq_release_variant_filename UNIQUE (release_version_id, filename);
    END IF;
END $$;

ALTER TABLE release_version_groups
    ADD COLUMN IF NOT EXISTS fansubgroup_id BIGINT REFERENCES fansub_groups(id) ON DELETE CASCADE;

UPDATE release_version_groups
SET fansubgroup_id = COALESCE(fansubgroup_id, fansub_group_id)
WHERE fansubgroup_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_release_version_group_version
    ON release_version_groups(release_version_id);
CREATE INDEX IF NOT EXISTS idx_release_version_group_group
    ON release_version_groups(fansubgroup_id);

ALTER TABLE release_streams
    ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS modified_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

UPDATE release_streams
SET modified_at = COALESCE(modified_at, updated_at, created_at)
WHERE modified_at IS NULL;

ALTER TABLE fansub_groups
    ADD COLUMN IF NOT EXISTS closed_year INTEGER,
    ADD COLUMN IF NOT EXISTS history_description TEXT;

UPDATE fansub_groups
SET closed_year = COALESCE(closed_year, dissolved_year),
    history_description = COALESCE(history_description, history)
WHERE closed_year IS NULL OR history_description IS NULL;

ALTER TABLE fansub_group_aliases
    ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES fansub_groups(id) ON DELETE CASCADE;

UPDATE fansub_group_aliases
SET group_id = COALESCE(group_id, fansub_group_id)
WHERE group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_fansub_group_alias_group
    ON fansub_group_aliases(group_id);

ALTER TABLE media_assets
    ADD CONSTRAINT fk_media_assets_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_media_assets_modified_by
        FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE release_media
    ADD CONSTRAINT fk_release_media_release
        FOREIGN KEY (release_id) REFERENCES fansub_releases(id) ON DELETE CASCADE;
