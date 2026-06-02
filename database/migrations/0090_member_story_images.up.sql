-- Migration 0090: Member-Eigentuemer-Bindung fuer Story-Bilder in media_assets.
-- Neue Spalte owner_member_id verknuepft ein Media-Asset mit dem Member, der es
-- als Story-Bild hochgeladen hat. Grundlage fuer IDOR-Schutz (D-03),
-- Pfad-Eigentuemer-Validierung (D-08) und Cleanup-on-Save (D-13/D-22).
-- Bestehende Zeilen erhalten NULL (kein Backfill noetig).

ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS owner_member_id BIGINT REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_member ON media_assets(owner_member_id) WHERE owner_member_id IS NOT NULL;
