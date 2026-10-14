-- Migration 0184: Drop the now-functionally-inert `anime.cover_image` legacy text column
-- (Phase 182, F-01, D-03). Plan 182-02 already removed every backend write path that touched
-- this column (syncLegacyAnimeCoverImageV2, the mirror-write in removeAnimePosterAssetsV2,
-- ApplyProviderCover's cover_image write) and migrated every raw reader onto the shared
-- animeCoverImageSelectSQL/animeCoverAvailableSQL COALESCE helpers, which this migration's
-- companion Plan-182-03 code change (Task 2) has already shortened to no longer reference
-- `cover_image` at all. By the time this migration runs, the column is read-irrelevant and
-- write-dead -- this migration only removes the now-empty storage.
--
-- Pre-flight safety check (D-03): abort the whole migration transaction with a clear error
-- naming the offending anime id(s) if any anime has a legacy-only cover -- i.e. `cover_image`
-- is set, but there is no matching V2 poster row in anime_media/media_assets/media_types. This
-- guards against ever dropping data that is still the only surviving cover reference for some
-- anime. Per 182-CONTEXT.md section 1a's inventory (live team4s_v2, 2026-10-14), 0 of 10 anime
-- would trigger this guard -- all 3 anime with a non-empty cover_image already have an
-- identical V2 poster row.
DO $$
DECLARE
    offending_count INTEGER;
    offending_ids TEXT;
BEGIN
    SELECT COUNT(*), STRING_AGG(a.id::TEXT, ', ' ORDER BY a.id)
    INTO offending_count, offending_ids
    FROM anime a
    WHERE a.cover_image IS NOT NULL
      AND BTRIM(a.cover_image) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM anime_media am
        JOIN media_assets ma ON ma.id = am.media_id
        JOIN media_types mt ON mt.id = ma.media_type_id
        WHERE am.anime_id = a.id
          AND mt.name = 'poster'
      );

    IF offending_count > 0 THEN
        RAISE EXCEPTION 'anime.cover_image drop blocked: % anime id(s) have a legacy-only cover with no matching V2 poster: %', offending_count, offending_ids;
    END IF;
END $$;

ALTER TABLE anime DROP COLUMN cover_image;
