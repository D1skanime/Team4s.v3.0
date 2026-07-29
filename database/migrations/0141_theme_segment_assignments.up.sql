-- Migration 0141: theme_segment_assignments (Many-to-Many Kara <-> release_version)
-- + additive composite UNIQUE (theme_segment_id, release_version_id) auf
-- theme_segment_playback_sources, koexistierend mit dem bestehenden 1:1-Index
-- (Drop des alten Index erfolgt erst in Plan 117-03 per Migration 0144, atomar
-- mit der Umstellung von syncThemeSegmentPlaybackSourceTx auf
-- ON CONFLICT (theme_segment_id, release_version_id) -- siehe
-- 117-01-PLAN.md Nyquist-Fix W1, Phase 117 D-01/D-03).

-- Teil A: neue Zuweisungstabelle -- repraesentiert die Admin-Zuweisungs-Absicht
-- ("dieses Kara gilt fuer diese Release-Version") unabhaengig davon, ob eine
-- konkrete Stream-Quelle bereits aufgeloest werden konnte.
CREATE TABLE IF NOT EXISTS theme_segment_assignments (
    id BIGSERIAL PRIMARY KEY,
    theme_segment_id BIGINT NOT NULL REFERENCES theme_segments(id) ON DELETE CASCADE,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_theme_segment_assignments_segment_version
    ON theme_segment_assignments (theme_segment_id, release_version_id);

-- Rueckwaertssuche fuer die oeffentliche Entdopplung (Plan 117-08).
CREATE INDEX IF NOT EXISTS idx_theme_segment_assignments_release_version
    ON theme_segment_assignments (release_version_id);

-- Admin-Zuweisungsliste (Plan 117-07).
CREATE INDEX IF NOT EXISTS idx_theme_segment_assignments_segment
    ON theme_segment_assignments (theme_segment_id);

-- Teil B: additive composite UNIQUE fuer Playback-Bindung, pro (Segment, Release-Version)
-- statt system-weit 1:1 pro Segment. Der bestehende 1:1-Index
-- (uq_theme_segment_playback_sources_segment) wird in DIESEM Plan NICHT angefasst
-- -- siehe Nyquist-Fix W1 in 117-01-PLAN.md Objective. Postgres behandelt NULL in
-- UNIQUE-Indizes als paarweise verschieden, daher verletzt diese neue Regel keine
-- bestehenden Zeilen, bevor der Backfill unten die Spalte befuellt.
ALTER TABLE theme_segment_playback_sources
    ADD COLUMN IF NOT EXISTS release_version_id BIGINT REFERENCES release_versions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_theme_segment_playback_sources_segment_version
    ON theme_segment_playback_sources (theme_segment_id, release_version_id);

-- Teil C: Bestandsdaten-Pruefung (beantwortet RESEARCH.md Open Question 2 zur
-- Ausfuehrungszeit, ohne die Migration bei einem beliebigen Ergebnis
-- fehlschlagen zu lassen) + Backfill bestehender Segmente.
DO $$
DECLARE
    multi_episode_segment_count integer;
BEGIN
    SELECT COUNT(*) INTO multi_episode_segment_count
    FROM theme_segments
    WHERE end_episode > start_episode;

    RAISE NOTICE 'Migration 0141: % theme_segments Zeilen mit echtem Mehrfolgen-Bereich (end_episode > start_episode) in den Bestandsdaten gefunden.', multi_episode_segment_count;
END $$;

-- Ermittelt fuer jedes theme_segments-Row mit vorhandenem
-- theme_segment_playback_sources-Eintrag die aktuell aufgeloeste
-- release_versions.id ueber dieselbe Join-Kette wie die bestehende
-- resolved_variant-CTE (admin_content_anime_themes.go:1366-1391), zusaetzlich
-- gefiltert auf Episoden innerhalb ts.start_episode..ts.end_episode (behebt
-- RESEARCH.md Risk 3 bereits auf Backfill-Ebene, analog zum episode_anchor-
-- Coalesce-Muster in HasReleaseAssetSegmentUploadBlockedForRelease,
-- admin_content_anime_themes.go:2149-2188).
WITH resolved AS (
    SELECT DISTINCT ON (ts.id)
        ts.id AS theme_segment_id,
        rv.id AS release_version_id
    FROM theme_segments ts
    JOIN theme_segment_playback_sources tps ON tps.theme_segment_id = ts.id
    JOIN themes t ON t.id = ts.theme_id
    JOIN release_version_groups rvg ON rvg.fansub_group_id = ts.fansub_group_id
    JOIN release_versions rv ON rv.id = rvg.release_version_id
        AND COALESCE(NULLIF(BTRIM(rv.version), ''), 'v1') = COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1')
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id AND ep.anime_id = t.anime_id
    LEFT JOIN release_variants rvv ON rvv.release_version_id = rv.id
    LEFT JOIN release_streams rs ON rs.variant_id = rvv.id
    LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id AND ss.provider_type = 'jellyfin'
    WHERE ts.fansub_group_id IS NOT NULL
      AND ts.start_episode IS NOT NULL
      AND ts.end_episode IS NOT NULL
      AND COALESCE(
            ep.sort_index,
            CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END
          ) BETWEEN ts.start_episode AND ts.end_episode
    ORDER BY
        ts.id,
        (CASE WHEN ss.external_id IS NOT NULL THEN 0 ELSE 1 END),
        rv.id ASC
)
INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
SELECT theme_segment_id, release_version_id
FROM resolved
ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING;

-- Funktioniert eindeutig, weil zu diesem Zeitpunkt (unmittelbar nach dem
-- Erst-Backfill) jedes Segment genau eine Zuweisung hat, auch wenn das Schema
-- kuenftig N Zuweisungen erlaubt.
UPDATE theme_segment_playback_sources tps
SET release_version_id = tsa.release_version_id
FROM theme_segment_assignments tsa
WHERE tsa.theme_segment_id = tps.theme_segment_id
  AND tps.release_version_id IS NULL;
