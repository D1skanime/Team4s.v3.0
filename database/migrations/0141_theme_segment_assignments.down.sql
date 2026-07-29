-- Migration 0141 down: entfernt die additive composite UNIQUE und die neue
-- release_version_id-Spalte auf theme_segment_playback_sources sowie die
-- theme_segment_assignments-Tabelle. Der alte 1:1-Index
-- (uq_theme_segment_playback_sources_segment) wurde von dieser Migration nie
-- angefasst -- kein Wiederherstellungsschritt noetig.

DROP INDEX IF EXISTS uq_theme_segment_playback_sources_segment_version;

ALTER TABLE theme_segment_playback_sources
    DROP COLUMN IF EXISTS release_version_id;

DROP TABLE IF EXISTS theme_segment_assignments;
