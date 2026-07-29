-- Migration 0144: Entfernt den in Plan 117-01 bewusst zurueckgehaltenen 1:1-Legacy-
-- Index auf theme_segment_playback_sources (Nyquist-Fix W1, siehe 117-01-PLAN.md
-- Objective und 117-03-PLAN.md Task 1). Wird ATOMAR im selben Executor-Task/Commit
-- angewendet wie die Umstellung von syncThemeSegmentPlaybackSourceTx auf die
-- composite ON CONFLICT (theme_segment_id, release_version_id)-Klausel -- es
-- existiert also nie ein Zustand, in dem Code (composite ON CONFLICT) und Schema
-- (noch vorhandener 1:1-Index) auseinanderlaufen.
--
-- Nach dieser Migration existiert nur noch der bereits in Migration 0141
-- angelegte composite UNIQUE-Index uq_theme_segment_playback_sources_segment_version
-- auf theme_segment_playback_sources (theme_segment_id, release_version_id).

DROP INDEX IF EXISTS uq_theme_segment_playback_sources_segment;
