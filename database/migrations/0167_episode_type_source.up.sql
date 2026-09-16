-- Migration 0167: Provenienz für den technischen Episodentyp.
-- Gegenstück zu episodes.filler_source (Migration 0045). Werte: NULL (Default,
-- keine belegte Herkunft) oder 'manual' (vom Admin gesetzt, Reimport-geschützt).
-- Additiv, ändert keine bestehenden Zeilen.
ALTER TABLE episodes
    ADD COLUMN IF NOT EXISTS episode_type_source VARCHAR(80);

COMMENT ON COLUMN episodes.episode_type_source IS 'Herkunft von episode_type_id: NULL = Default/Import, manual = Admin-Override';
COMMENT ON COLUMN episodes.filler_source IS 'Herkunft von filler_type_id: anisearch = Import, manual = Admin-Override';
