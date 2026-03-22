-- Migration 0036: Backfill release tables from episode_versions (Phase C)
-- Maps legacy episode_versions data to new normalized structure

-- Step 1: Create fansub_releases from episode_versions
-- Need to find matching episode_id from episodes table
INSERT INTO fansub_releases (episode_id, source_id, release_date, created_at)
SELECT DISTINCT ON (e.id, ev.fansub_group_id)
    e.id as episode_id,
    (SELECT id FROM release_sources WHERE name = 'Legacy') as source_id,
    ev.release_date,
    ev.created_at
FROM episode_versions ev
JOIN episodes e ON e.anime_id = ev.anime_id
    AND CAST(e.episode_number AS INTEGER) = ev.episode_number
WHERE e.episode_number ~ '^\d+$'
ORDER BY e.id, ev.fansub_group_id, ev.created_at;

-- Step 2: Create release_versions (v1 for each release)
INSERT INTO release_versions (release_id, version, created_at)
SELECT id, 'v1', created_at
FROM fansub_releases;

-- Step 3: Create release_variants from episode_versions
INSERT INTO release_variants (release_version_id, resolution, created_at)
SELECT DISTINCT ON (rv.id)
    rv.id,
    COALESCE(ev.video_quality, 'unknown'),
    ev.created_at
FROM release_versions rv
JOIN fansub_releases fr ON rv.release_id = fr.id
JOIN episodes e ON fr.episode_id = e.id
JOIN episode_versions ev ON ev.anime_id = e.anime_id
    AND ev.episode_number = CAST(e.episode_number AS INTEGER)
WHERE e.episode_number ~ '^\d+$'
ORDER BY rv.id, ev.created_at;

-- Step 4: Create streams from episode_versions
INSERT INTO streams (variant_id, stream_type_id, provider_type, external_id, stream_url, created_at)
SELECT DISTINCT ON (rvar.id)
    rvar.id,
    (SELECT id FROM stream_types WHERE name = 'episode'),
    ev.media_provider,
    ev.media_item_id,
    ev.stream_url,
    ev.created_at
FROM release_variants rvar
JOIN release_versions rv ON rvar.release_version_id = rv.id
JOIN fansub_releases fr ON rv.release_id = fr.id
JOIN episodes e ON fr.episode_id = e.id
JOIN episode_versions ev ON ev.anime_id = e.anime_id
    AND ev.episode_number = CAST(e.episode_number AS INTEGER)
WHERE e.episode_number ~ '^\d+$'
ORDER BY rvar.id, ev.created_at;

-- Step 5: Create release_version_groups from episode_versions.fansub_group_id
INSERT INTO release_version_groups (release_version_id, fansub_group_id, created_at)
SELECT DISTINCT ON (rv.id, ev.fansub_group_id)
    rv.id,
    ev.fansub_group_id,
    ev.created_at
FROM release_versions rv
JOIN fansub_releases fr ON rv.release_id = fr.id
JOIN episodes e ON fr.episode_id = e.id
JOIN episode_versions ev ON ev.anime_id = e.anime_id
    AND ev.episode_number = CAST(e.episode_number AS INTEGER)
WHERE e.episode_number ~ '^\d+$'
    AND ev.fansub_group_id IS NOT NULL
ORDER BY rv.id, ev.fansub_group_id, ev.created_at;

-- Add reference from episode_versions to fansub_releases for transition period
ALTER TABLE episode_versions ADD COLUMN IF NOT EXISTS fansub_release_id BIGINT REFERENCES fansub_releases(id);

COMMENT ON COLUMN episode_versions.fansub_release_id IS 'Reference to migrated fansub_release (transition period)';
