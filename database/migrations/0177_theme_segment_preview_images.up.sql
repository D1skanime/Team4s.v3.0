-- Migration 0177: Vorschaubild pro Kara-Segment (Phase 172, D-01/D-08).
-- Zwei unabhaengige nullable FK-Spalten statt einer einzigen Spalte: eine manuelle Wahl
-- (preview_media_asset_id) darf durch keinen spaeteren Render verloren gehen, UND
-- "Automatisches Bild verwenden" (Rueckkehr zum automatischen Bild) muss ohne einen neuen
-- Render funktionieren -- das erfordert, dass das zuletzt erzeugte automatische Bild
-- (auto_preview_media_asset_id) jederzeit unabhaengig von einer evtl. gesetzten manuellen
-- Wahl erhalten bleibt. ON DELETE SET NULL degradiert das Segment auf den serverseitigen
-- Ersatzbild-Pfad (resolveThemeSegmentPreviewAsset), statt das Segment selbst zu entfernen.
ALTER TABLE theme_segments
    ADD COLUMN preview_media_asset_id BIGINT NULL REFERENCES media_assets(id) ON DELETE SET NULL,
    ADD COLUMN auto_preview_media_asset_id BIGINT NULL REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE INDEX idx_theme_segments_preview_media_asset
    ON theme_segments(preview_media_asset_id)
    WHERE preview_media_asset_id IS NOT NULL;

CREATE INDEX idx_theme_segments_auto_preview_media_asset
    ON theme_segments(auto_preview_media_asset_id)
    WHERE auto_preview_media_asset_id IS NOT NULL;
