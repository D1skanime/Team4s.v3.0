-- Migration 0161: theme_segments.origin_release_version_id
--
-- Fuehrt eine neue, nullable und administrativ korrigierbare Herkunfts-Referenz
-- pro Kara-/Theme-Segment ein (Phase 156, Workstream C, P156-05/P156-06).
-- `theme_segment_playback_sources.release_version_id` ist eine technische
-- Playback-Bindung, keine fachliche Herkunft, und ist daher hier NICHT
-- wiederverwendbar. ON DELETE SET NULL (nicht CASCADE), weil eine geloeschte
-- Release-Version niemals das Segment selbst mitreissen darf -- die Origin ist
-- korrigierbar, keine unveraenderliche Momentaufnahme (156-CONTEXT.md
-- Workstream C). Muster analog 0143 (Spalte+Index) und 0131 (ON DELETE SET
-- NULL-Hausstil).

ALTER TABLE theme_segments
    ADD COLUMN IF NOT EXISTS origin_release_version_id BIGINT REFERENCES release_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_theme_segments_origin_release_version
    ON theme_segments (origin_release_version_id);

-- Bestandsdaten-Pruefung vor dem Backfill (Muster analog 0141): zaehlt Segmente
-- mit und ohne mindestens eine theme_segment_assignments-Zeile, ohne die
-- Migration bei einem beliebigen Ergebnis fehlschlagen zu lassen.
DO $$
DECLARE
    segments_with_assignment_count integer;
    segments_without_assignment_count integer;
BEGIN
    SELECT COUNT(*) INTO segments_with_assignment_count
    FROM theme_segments ts
    WHERE EXISTS (
        SELECT 1 FROM theme_segment_assignments tsa WHERE tsa.theme_segment_id = ts.id
    );

    SELECT COUNT(*) INTO segments_without_assignment_count
    FROM theme_segments ts
    WHERE NOT EXISTS (
        SELECT 1 FROM theme_segment_assignments tsa WHERE tsa.theme_segment_id = ts.id
    );

    RAISE NOTICE 'Migration 0161: % theme_segments Zeilen mit mindestens einer Zuweisung (werden befuellt), % ohne Zuweisung (bleiben NULL -- "Origin nicht bestimmt").', segments_with_assignment_count, segments_without_assignment_count;
END $$;

-- Deterministischer Backfill: niedrigste aufgeloeste Episode innerhalb der
-- zugewiesenen Release-Versionen als konservativer Fallback (156-CONTEXT.md
-- Workstream C). Segmente ohne Zuweisung bleiben durch Konstruktion NULL --
-- ihnen wird nie ein Ersatzwert zugewiesen.
WITH origin_candidate AS (
    SELECT DISTINCT ON (tsa.theme_segment_id)
        tsa.theme_segment_id,
        tsa.release_version_id
    FROM theme_segment_assignments tsa
    JOIN release_versions rv ON rv.id = tsa.release_version_id
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    ORDER BY
        tsa.theme_segment_id,
        COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int END) ASC NULLS LAST,
        tsa.release_version_id ASC
)
UPDATE theme_segments ts
SET origin_release_version_id = oc.release_version_id
FROM origin_candidate oc
WHERE ts.id = oc.theme_segment_id
  AND ts.origin_release_version_id IS NULL;
