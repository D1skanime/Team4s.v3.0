-- Rollback fuer Migration 0144: stellt den alten 1:1-Legacy-Index wieder her.
--
-- ACHTUNG (dokumentiertes, akzeptiertes Rollback-Risiko, siehe 117-03-PLAN.md
-- Task 1 <action>): Dieser Schritt schlaegt fehl, falls zu diesem Zeitpunkt
-- bereits echte Mehrfach-Zuweisungen existieren, d.h. mehr als eine
-- theme_segment_playback_sources-Zeile pro theme_segment_id (das ist nach
-- Plan 117-03 der erwartete Normalfall fuer geteilte Kara-Segmente, D-03).
-- Ein Rollback von Migration 0144 ist daher nur sicher, solange noch keine
-- echten Mehrfach-Zuweisungen im Bestand existieren.

CREATE UNIQUE INDEX IF NOT EXISTS uq_theme_segment_playback_sources_segment
    ON theme_segment_playback_sources (theme_segment_id);
