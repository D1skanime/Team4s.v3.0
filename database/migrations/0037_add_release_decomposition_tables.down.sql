-- Migration 0037 down: Reverse the release-decomposition normalization.
--
-- The up migration is additive (new columns/constraints/indexes on existing
-- release tables, plus three new tables: release_streams, stream_sources,
-- visibilities). This rollback undoes those changes in strict reverse order
-- so that migrations applied before 0037 (notably 0035's release_variants
-- table) can drop cleanly afterward. Previously this file was an intentional
-- no-op documented as "no destructive rollback is performed here"; that left
-- release_streams' FK to release_variants(id) in place, which blocked
-- 0035's `DROP TABLE release_variants` during a full Down chain (PMQA-03
-- fresh/up/down proof, Phase 134 Plan 02).

DROP TABLE IF EXISTS release_streams;
DROP TABLE IF EXISTS stream_sources;
DROP TABLE IF EXISTS visibilities;

DROP INDEX IF EXISTS idx_release_variants_release_version_id;

ALTER TABLE release_variants
    DROP CONSTRAINT IF EXISTS chk_release_variants_subtitle_type;

ALTER TABLE release_variants
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS file_size_bytes,
    DROP COLUMN IF EXISTS video_quality,
    DROP COLUMN IF EXISTS subtitle_type;

DROP INDEX IF EXISTS idx_release_versions_release_date;
DROP INDEX IF EXISTS idx_release_versions_release_id;

ALTER TABLE release_versions
    DROP CONSTRAINT IF EXISTS uq_release_versions_release_version;

ALTER TABLE release_versions
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS title,
    DROP COLUMN IF EXISTS release_date,
    DROP COLUMN IF EXISTS legacy_episode_version_id;

ALTER TABLE fansub_releases
    DROP COLUMN IF EXISTS updated_at;

DROP INDEX IF EXISTS idx_release_sources_type;

ALTER TABLE release_sources
    DROP COLUMN IF EXISTS type;
