-- Migration 0164: theme_segments.origin_release_version_id repair (GAP-04/GAP-05)
--
-- Bundled, idempotent bulk repair for the live production rows that predate Plan 156-16's
-- ensureThemeSegmentOriginTx (Phase 156, GAP-04/GAP-05 aus der Live-UAT vom 2026-09-14). Vor
-- diesem Plan wurde theme_segments.origin_release_version_id NUR beim expliziten
-- SetThemeSegmentOrigin-Aufruf geprueft, nie erneut, wenn sich die Zuweisungsmenge selbst
-- aenderte -- dadurch konnten in `team4s_v2` zwei Fehlklassen entstehen:
--   (a) eine Origin, die auf eine Release-Version zeigt, der das Segment nicht mehr zugewiesen
--       ist (bewiesener Live-Fall: Segment 3, origin_release_version_id=29, tatsaechlich nur
--       Zuweisungen 40/41), und
--   (b) eine fehlende (NULL) Origin, obwohl das Segment Zuweisungen hat (bewiesener Live-Fall:
--       Segmente 4 und 5).
--
-- Die exakt gleiche Regel wie `ensureThemeSegmentOriginTx`s themeSegmentOriginRecomputeQuery
-- (backend/internal/repository/theme_segment_origin_sync.go) und Migration 0161s
-- origin_candidate-CTE -- niedrigste aufgeloeste Episode, tsa.release_version_id ASC als
-- Tie-Breaker -- wird hier woertlich wiederverwendet (siehe
-- theme_segment_origin_migration_repair_integration_test.go's SQL/Go-Aequivalenzbeweis).
--
-- Idempotenz durch Konstruktion, KEIN separates Flag noetig: `segments_needing_repair`s
-- WHERE-Praedikat pruef bei JEDEM Lauf den AKTUELLEN Zustand neu (ist die gespeicherte Origin
-- gerade JETZT ungueltig/fehlend?) -- nach einem erfolgreichen ersten Lauf ist keine Zeile mehr
-- ungueltig/fehlend, also ist `segments_needing_repair` beim zweiten Lauf leer und die
-- nachfolgenden UPDATE/DELETE-Schritte betreffen null Zeilen.

DO $$
DECLARE
    stale_origin_count integer;
    missing_origin_count integer;
BEGIN
    SELECT COUNT(*) INTO stale_origin_count
    FROM theme_segments ts
    WHERE ts.origin_release_version_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM theme_segment_assignments tsa
        WHERE tsa.theme_segment_id = ts.id
          AND tsa.release_version_id = ts.origin_release_version_id
      );

    SELECT COUNT(*) INTO missing_origin_count
    FROM theme_segments ts
    WHERE ts.origin_release_version_id IS NULL
      AND EXISTS (
        SELECT 1 FROM theme_segment_assignments tsa WHERE tsa.theme_segment_id = ts.id
      );

    RAISE NOTICE 'Migration 0164: % theme_segments Zeilen mit veralteter (nicht mehr zugewiesener) Origin (Fall a), % Zeilen mit fehlender Origin trotz vorhandener Zuweisung (Fall b) -- beide werden jetzt per derselben Regel wie ensureThemeSegmentOriginTx/Migration 0161 repariert.', stale_origin_count, missing_origin_count;
END $$;

WITH origin_candidate AS (
    -- Woertlich identisch zu Migration 0161s origin_candidate-CTE und
    -- theme_segment_origin_sync.go's themeSegmentOriginRecomputeQuery (pro Segment statt pro
    -- release_version_id parametrisiert dort; hier fuer den Bulk-Lauf ueber ALLE Segmente).
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
),
segments_needing_repair AS (
    -- Exakt die beiden oben gezaehlten Faelle (a)/(b), erneut ausgewertet (Idempotenz-Basis).
    -- new_origin ist NULL, wenn das Segment (Fall a) inzwischen ueberhaupt keine Zuweisung mehr
    -- hat -- dieselbe "NULL bleibt/wird NULL"-Semantik wie ensureThemeSegmentOriginTx.
    SELECT
        ts.id AS theme_segment_id,
        oc.release_version_id AS new_origin
    FROM theme_segments ts
    LEFT JOIN origin_candidate oc ON oc.theme_segment_id = ts.id
    WHERE
        (
            ts.origin_release_version_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM theme_segment_assignments tsa
                WHERE tsa.theme_segment_id = ts.id
                  AND tsa.release_version_id = ts.origin_release_version_id
            )
        )
        OR
        (
            ts.origin_release_version_id IS NULL
            AND EXISTS (
                SELECT 1 FROM theme_segment_assignments tsa WHERE tsa.theme_segment_id = ts.id
            )
        )
),
applied AS (
    UPDATE theme_segments ts
    SET origin_release_version_id = snr.new_origin
    FROM segments_needing_repair snr
    WHERE ts.id = snr.theme_segment_id
    RETURNING ts.id AS theme_segment_id, snr.new_origin AS new_origin
),
-- Die folgenden drei CTEs mirroren loadPublicEffectiveContributors's
-- release_version_groups + anime_contributions-Mitgliedschaftslogik (public_effective_
-- contributors.go) fuer GENAU die reparierten Segmente -- ohne die reinen Anzeige-Spalten
-- (Name/Avatar/Rollenbeschriftung), die die Mitgliedschaft selbst nie beeinflussen.
contributor_candidates AS (
    SELECT
        a.theme_segment_id,
        ac.member_id,
        (ac.release_version_id = a.new_origin) AS is_override,
        (COALESCE(ac.is_public_on_anime_page, false) AND COALESCE(v.name, 'public') = 'public') AS is_public,
        rvg.fansub_group_id
    FROM applied a
    JOIN release_versions rv ON rv.id = a.new_origin
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes e ON e.id = fr.episode_id
    JOIN release_version_groups rvg ON rvg.release_version_id = a.new_origin
    JOIN anime_contributions ac
      ON ac.fansub_group_id = rvg.fansub_group_id
     AND (
        ac.release_version_id = a.new_origin
        OR (ac.release_version_id IS NULL AND ac.anime_id = e.anime_id)
     )
    LEFT JOIN visibilities v ON v.id = ac.visibility_id
    WHERE a.new_origin IS NOT NULL
),
group_has_override AS (
    -- Pro (Segment, Fansub-Gruppe): gibt es mindestens eine Override-Zeile fuer die NEUE Origin?
    -- Wenn ja, zaehlen NUR Override-Zeilen dieser Gruppe; wenn nein, nur Anime-Default-Zeilen --
    -- exakt resolvePublicEffectiveContributors's Praezedenz-Logik.
    SELECT theme_segment_id, fansub_group_id, bool_or(is_override) AS has_override
    FROM contributor_candidates
    GROUP BY theme_segment_id, fansub_group_id
),
contributor_membership AS (
    SELECT DISTINCT cc.theme_segment_id, cc.member_id
    FROM contributor_candidates cc
    JOIN group_has_override gho
      ON gho.theme_segment_id = cc.theme_segment_id AND gho.fansub_group_id = cc.fansub_group_id
    WHERE cc.is_override = gho.has_override
      AND cc.is_public
)
-- Atomarer Cleanup (SELBE Transaktion wie das UPDATE oben, da alles EIN WITH-Statement ist):
-- fuer jedes reparierte Segment werden alle theme_segment_contributors-Zeilen entfernt, deren
-- member_id KEIN effektiver Contributor der NEUEN Origin ist -- niemals eine neue Zeile
-- eingefuegt (T-156-22/keine Auto-Selektion). Ein Segment, dessen Origin bereits gueltig war
-- (nicht in `applied`), wird von diesem DELETE nie erreicht (T-156-24).
DELETE FROM theme_segment_contributors tsc
USING applied a
WHERE tsc.theme_segment_id = a.theme_segment_id
  AND NOT EXISTS (
    SELECT 1 FROM contributor_membership cm
    WHERE cm.theme_segment_id = a.theme_segment_id
      AND cm.member_id = tsc.member_id
  );
