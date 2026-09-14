-- Migration 0165: theme_segments.contributors_initialized_at + one-time GAP-07 backfill
--
-- Closes 156-UAT.md GAP-07 ("Segment-Mitwirkende automatisch vorauswaehlen (gespeichert,
-- abwaehlbar)", Auftraggeber-bestaetigt 2026-09-14, Phase 156, Plan 156-18). Adds the nullable
-- marker column that ensureThemeSegmentContributorsPreselectedTx
-- (backend/internal/repository/theme_segment_contributor_preselection.go) uses to guarantee
-- preselection fires EXACTLY ONCE per segment, then runs a one-time, idempotent backfill for the
-- live production rows that predate this plan.
--
-- The backfill mirrors public_effective_contributors.go's loadPublicEffectiveContributors
-- override-precedence join EXACTLY (membership only, no display columns -- the same
-- "membership only" reduction Migration 0164 already applied to this same join family), filtered
-- to permissions.SegmentCreditRoleCodes's current six codes (translator, timer, karaoke_fx,
-- typesetter, editor, quality_checker) -- proven equal to that Go slice by
-- theme_segment_contributor_preselection_migration_test.go's mandatory SQL/Go equivalence test.
--
-- Idempotent by construction, KEIN separates Flag noetig: the `targets` CTE only ever matches a
-- segment with a valid origin, a NULL marker, AND zero existing theme_segment_contributors rows
-- -- after a successful first run every origin-having segment has a non-NULL marker, so `targets`
-- (and therefore the INSERT) match nothing on a second run. The trailing bare UPDATE covers BOTH
-- the just-preselected segments AND any segment that already had a selection (the confirmed live
-- "op" case) in one idempotent statement.

-- The column must exist before the counting block below can reference it -- ADD COLUMN runs
-- FIRST, deliberately reordered from the plan's interface skeleton (which showed the counting
-- block before the ALTER TABLE) after this exact bug surfaced against the live `team4s_v2`
-- database during Task 3 verification: a fresh, unmigrated database has no
-- contributors_initialized_at column yet, so a counting query referencing it before the ALTER
-- TABLE runs fails with "column does not exist". IF NOT EXISTS keeps this idempotent either way.
ALTER TABLE theme_segments
    ADD COLUMN IF NOT EXISTS contributors_initialized_at TIMESTAMPTZ NULL;

DO $$
DECLARE
    to_preselect_count integer;
    already_selected_count integer;
BEGIN
    SELECT COUNT(*) INTO to_preselect_count
    FROM theme_segments ts
    WHERE ts.origin_release_version_id IS NOT NULL
      AND ts.contributors_initialized_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM theme_segment_contributors tsc WHERE tsc.theme_segment_id = ts.id);

    SELECT COUNT(*) INTO already_selected_count
    FROM theme_segments ts
    WHERE ts.origin_release_version_id IS NOT NULL
      AND ts.contributors_initialized_at IS NULL
      AND EXISTS (SELECT 1 FROM theme_segment_contributors tsc WHERE tsc.theme_segment_id = ts.id);

    RAISE NOTICE 'Migration 0165: % theme_segments Zeilen werden erstmals preselectet (gueltige Origin, NULL Merker, leere Auswahl), % Zeilen haben bereits eine Auswahl und bekommen NUR den Merker gesetzt (Auswahl bleibt byte-identisch).', to_preselect_count, already_selected_count;
END $$;

WITH targets AS (
    SELECT ts.id AS theme_segment_id, ts.origin_release_version_id AS release_version_id
    FROM theme_segments ts
    WHERE ts.origin_release_version_id IS NOT NULL
      AND ts.contributors_initialized_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM theme_segment_contributors tsc WHERE tsc.theme_segment_id = ts.id)
),
release_context AS (
    SELECT t.theme_segment_id, t.release_version_id, e.anime_id
    FROM targets t
    JOIN release_versions rv ON rv.id = t.release_version_id
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes e ON e.id = fr.episode_id
),
candidate AS (
    SELECT
        rc.theme_segment_id, rc.release_version_id, ac.id AS contribution_id,
        ac.fansub_group_id, ac.member_id,
        COALESCE(ac.release_version_id = rc.release_version_id, false) AS is_override,
        (COALESCE(ac.is_public_on_anime_page = true, false) AND COALESCE(v.name, 'public') = 'public') AS is_public,
        COALESCE(ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes
    FROM release_context rc
    JOIN release_version_groups rvg ON rvg.release_version_id = rc.release_version_id
    JOIN anime_contributions ac
      ON ac.fansub_group_id = rvg.fansub_group_id
     AND (ac.release_version_id = rc.release_version_id OR (ac.release_version_id IS NULL AND ac.anime_id = rc.anime_id))
    LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
    LEFT JOIN visibilities v ON v.id = ac.visibility_id
    GROUP BY rc.theme_segment_id, rc.release_version_id, ac.id, ac.fansub_group_id, ac.member_id, ac.release_version_id, v.name, ac.is_public_on_anime_page
),
group_override AS (
    SELECT theme_segment_id, release_version_id, fansub_group_id, bool_or(is_override) AS has_override
    FROM candidate GROUP BY theme_segment_id, release_version_id, fansub_group_id
),
effective AS (
    SELECT DISTINCT c.theme_segment_id, c.member_id
    FROM candidate c
    JOIN group_override go ON go.theme_segment_id = c.theme_segment_id AND go.release_version_id = c.release_version_id AND go.fansub_group_id = c.fansub_group_id
    WHERE c.is_override = go.has_override
      AND c.is_public
      AND c.role_codes && ARRAY['translator','timer','karaoke_fx','typesetter','editor','quality_checker']::text[]
)
INSERT INTO theme_segment_contributors (theme_segment_id, member_id)
SELECT theme_segment_id, member_id FROM effective
ON CONFLICT (theme_segment_id, member_id) DO NOTHING;

UPDATE theme_segments
SET contributors_initialized_at = NOW()
WHERE origin_release_version_id IS NOT NULL AND contributors_initialized_at IS NULL;
