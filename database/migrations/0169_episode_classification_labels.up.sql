-- Migration 0169: Deutsche Anzeigenamen für Canon/Filler und Episodentyp (GAP-11).
-- episode_filler_types.name / episode_types.name bleiben die stabilen, unveränderten
-- Codes (canon/filler/mixed/...; episode/special/ova/...). Diese Migration fügt rein
-- additiv eine "label"-Spalte hinzu und befüllt sie mit den heutigen, vom
-- Auftraggeber am 2026-09-18 bestätigten Admin-Anzeigenamen (siehe 164-UAT.md GAP-11,
-- 164-10-PLAN.md Interfaces-Sektion) -- keine Zeile wird gelöscht oder umbenannt, keine
-- NOT NULL-Zwangsbedingung, kein neuer Wert.
ALTER TABLE episode_filler_types ADD COLUMN IF NOT EXISTS label VARCHAR(80);
ALTER TABLE episode_types ADD COLUMN IF NOT EXISTS label VARCHAR(80);

COMMENT ON COLUMN episode_filler_types.label IS 'Anzeigename (Admin + öffentliche Seite, GAP-11). name bleibt der stabile Code.';
COMMENT ON COLUMN episode_types.label IS 'Anzeigename (Admin + öffentliche Seite, GAP-11). name bleibt der stabile Code.';

UPDATE episode_filler_types SET label = CASE name
    WHEN 'unknown' THEN 'Unbekannt'
    WHEN 'canon'   THEN 'Haupthandlung'
    WHEN 'filler'  THEN 'Zusatzfolge'
    WHEN 'mixed'   THEN 'Teilweise Zusatzfolge'
    WHEN 'recap'   THEN 'Rückblick'
    ELSE label
END;

UPDATE episode_types SET label = CASE name
    WHEN 'episode'  THEN 'Episode'
    WHEN 'special'  THEN 'Special'
    WHEN 'ova'      THEN 'OVA'
    WHEN 'ona'      THEN 'ONA'
    WHEN 'movie'    THEN 'Movie'
    WHEN 'recap'    THEN 'Recap'
    WHEN 'preview'  THEN 'Preview'
    WHEN 'prologue' THEN 'Prologue'
    WHEN 'epilogue' THEN 'Epilogue'
    WHEN 'bonus'    THEN 'Bonus'
    ELSE label
END;
