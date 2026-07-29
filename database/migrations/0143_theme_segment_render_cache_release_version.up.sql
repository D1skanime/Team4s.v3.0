-- Migration 0143: release_version_id an theme_segment_render_cache
-- Behebt RESEARCH.md Risk 1 (Cache-Key nur an theme_segment_id gebunden, kein
-- Folgen-Diskriminator -- ein Override fuer Folge 7 wuerde sonst denselben
-- Cache-Eintrag wie Folge 1 ueberschreiben/kollidieren). Additiv/nullable,
-- damit bestehende Cache-Rows ohne bekannten Kontext gueltig bleiben. Die
-- Repository-Query-Anpassungen, die diese Spalte tatsaechlich in den
-- WHERE-Klauseln nutzen, folgen in Plan 117-03 -- dieser Plan liefert nur das
-- additive Schema.

ALTER TABLE theme_segment_render_cache
    ADD COLUMN IF NOT EXISTS release_version_id BIGINT REFERENCES release_versions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_theme_segment_render_cache_segment_version
    ON theme_segment_render_cache (theme_segment_id, release_version_id, status);
