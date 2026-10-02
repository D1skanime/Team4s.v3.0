---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 09
subsystem: api
tags: [go, pgx, postgres, media, anime, fansub, kara-segments, display-variant]

# Dependency graph
requires:
  - phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
    provides: "the 'display' media_files variant written at upload time by 173-01/173-02/173-04, consumed here on four read sites that previously resolved straight to thumb/original with no separate display_url field"
provides:
  - "Kara-segment fallback preview (theme_segment_preview.go), anime cover/banner/logo (anime_v2.go GetAnimeDetailV2 + anime_assets.go V1/V2 GetResolvedAssets), and the fansub project banner (fansub_project_artwork.go) all now resolve their EXISTING preview_url/cover_image/banner_url fields to the display variant ahead of thumb/original"
affects: [173-13, 173-14, 173-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fix-in-place display priority: for sites with NO separate thumbnail_url/original_url split, add a display-preferring LATERAL/CASE branch directly into the existing single-URL-resolving query, under the unchanged field name -- no new API field, unlike 173-08's add-alongside display_url pattern"

key-files:
  created:
    - backend/internal/repository/anime_display_variant_test.go
  modified:
    - backend/internal/repository/theme_segment_preview.go
    - backend/internal/repository/theme_segment_preview_test.go
    - backend/internal/repository/anime_v2.go
    - backend/internal/repository/anime_assets.go
    - backend/internal/repository/fansub_project_artwork.go

key-decisions:
  - "Kara fallback (both single-asset and batch resolvers): added mf_display LEFT JOIN, COALESCE(mf_display.path, mf_thumb.path, mf_orig.path, ma.file_path) -- display now ranks above the pre-existing thumb-first chain"
  - "anime_v2.go poster LATERAL: added a nested display-only LATERAL and changed the SELECT to COALESCE(poster_display.path, ma.file_path) -- the pre-existing poster LATERAL never joined media_files at all (bare ma.file_path), so pre-backfill parity means falling back to ma.file_path, NOT to an 'original' media_files row"
  - "anime_v2.go banner LATERAL + fansub_project_artwork.go's identical anime_banner_file LATERAL: changed the ranking CASE to display(0) > original/NULL(1) > else(2) and dropped the now-redundant WHERE-level 'original'-only filter so display rows are not excluded from consideration"
  - "anime_assets.go V1 GetResolvedAssets: converted cover_mf/banner_mf/background mf from equality-filtered LEFT JOINs (which could only ever see 'original'/NULL rows) to ranked LATERALs (display > original/NULL > else), preserving the untouched outer ORDER BY ... LIMIT 1 pairing logic"
  - "anime_assets.go V2 getResolvedAssetsV2 + its two sibling inline LATERALs (removeAnimePosterAssetsV2, syncLegacyAnimeCoverImageV2) all share the identical CASE change for consistency, per the plan's explicit instruction that all three resolve the same media_files row set"
  - "fansub_project_artwork.go's publicProjectBannerSelectSQL: added a bmf_display candidate as the SECOND COALESCE branch (after anime_banner.path, before the legacy bmf original-only subquery) -- this only matters for the legacy banner_asset_id-direct path with no anime_media link, since anime_banner.path is itself already display-preferring once the JOIN fix lands"

requirements-completed: [REQ-173-22, REQ-173-23]

duration: 65min
completed: 2026-10-02
---

# Phase 173 Plan 09: Public image quality - display-variant fix-in-place for four non-split read sites Summary

**Fixed four backend read sites that resolve a single public image URL (no existing thumbnail_url/original_url split) to prefer the 'display' media_files variant ahead of thumb/original, under their unchanged field names: the Kara-segment fallback preview, anime cover/banner/logo (both V1 and V2 schema paths), and the fansub project banner.**

## Performance

- **Duration:** ~65 min
- **Started:** 2026-10-02T16:50Z (approx, immediately after 173-08's completion)
- **Completed:** 2026-10-02T17:55Z (approx)
- **Tasks:** 2/2
- **Files modified:** 4 production files + 2 test files (1 new, 1 extended)

## Accomplishments
- The Kara-segment fallback preview's two resolvers (`resolveThemeSegmentPreviewAsset`'s fallback branch and `resolveThemeSegmentPreviewAssetsBatch`'s fallback branch, both in `theme_segment_preview.go`) now resolve `preview_url` to the display variant ahead of thumb/original when a display row exists -- the exact pixelation bug CONTEXT.md cites at `theme_segment_preview.go:97-101,371-375`.
- The anime detail page's cover (`cover_image`, via `anime_v2.go`'s `GetAnimeDetailV2`/`getByIDV2`) and banner (`banner_url`) now prefer display over original/bare-file_path.
- `AnimeAssetRepository.GetResolvedAssets` (both the legacy-column V1 path and the `anime_media`-backed V2 path, `anime_assets.go`) resolves Cover/Banner/Logo/Background URLs to display ahead of original, with the V2 path's two sibling inline LATERALs (`removeAnimePosterAssetsV2`, `syncLegacyAnimeCoverImageV2`) kept consistent.
- The fansub project banner card's source (`fansub_project_artwork.go`'s shared `publicProjectBannerSelectSQL`/`publicProjectBannerJoinSQL`, used by `listPublicFansubProjects` and the project resolver) resolves to display ahead of original, for both the `anime_media`-linked path and the legacy `banner_asset_id`-direct-column path.
- Zero new HTTP routes: `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` is unchanged at 98, and `git diff --stat` on `main.go` is empty.
- Pre-backfill (no display row yet) behavior is unchanged at every site -- proven against real Postgres, not just source-text inspection, for both the with-display and without-display cases.

## Task Commits

Each task was committed atomically, following RED (failing test) -> GREEN (implementation) per `tdd="true"`:

1. **Task 1: Kara segment fallback preview prefers display over thumb**
   - `b9a2dda6` (test): failing test for display-over-thumb preference, single-asset + batch resolvers
   - `952e447d` (feat): implementation -- `mf_display` LEFT JOIN + COALESCE reorder in both fallback queries
2. **Task 2: Anime cover/banner/logo and fansub project banner prefer display over original**
   - `1c3ed0cb` (test): failing tests for `GetByID`/`GetResolvedAssets` (V1+V2)/`listPublicFansubProjects`
   - `37245186` (feat): implementation across `anime_v2.go`, `anime_assets.go`, `fansub_project_artwork.go`

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `backend/internal/repository/theme_segment_preview.go` - both fallback queries (`resolveThemeSegmentPreviewAsset`, `resolveThemeSegmentPreviewAssetsBatch`) gain an `mf_display` LEFT JOIN and a reordered COALESCE
- `backend/internal/repository/theme_segment_preview_test.go` - extended `TestResolveThemeSegmentPreviewAsset` with two new subtests (display-wins, pre-backfill-thumb-still-wins) and a new `TestResolveThemeSegmentPreviewAssetsBatch_FallbackPrefersDisplayOverThumb` cross-checked against the single-asset resolver
- `backend/internal/repository/anime_v2.go` - `GetAnimeDetailV2`'s poster LATERAL gains a nested `poster_display` LATERAL + COALESCE; banner LATERAL's ranking CASE now prefers display
- `backend/internal/repository/anime_assets.go` - V1 `GetResolvedAssets`'s cover_mf/banner_mf and the background-assets `mf` join become ranked LATERALs; V2 `getResolvedAssetsV2` + its two sibling inline LATERALs (`removeAnimePosterAssetsV2`, `syncLegacyAnimeCoverImageV2`) all rank display first
- `backend/internal/repository/fansub_project_artwork.go` - `publicProjectBannerJoinSQL`'s inner CASE ranks display first; `publicProjectBannerSelectSQL` gains a `bmf_display` COALESCE candidate ahead of the legacy original-only fallback
- `backend/internal/repository/anime_display_variant_test.go` (new) - `TestGetByIDV2_PosterBannerPreferDisplayOverOriginal`, `TestGetResolvedAssetsV1_CoverBannerBackgroundPreferDisplayOverOriginal`, `TestGetResolvedAssetsV2_CoverBannerLogoPreferDisplayOverOriginal`, `TestListPublicFansubProjects_BannerPrefersDisplayOverOriginal` -- all against real, isolated Postgres fixtures (`TEAM4S_PHASE106_TEST_DSN`)

## Decisions Made
- Kept the plan's narrow file scope exactly as specified: `anime.go`'s separate legacy (pre-`anime.slug`) `GetByID` banner LATERAL was NOT touched, since the plan's `files_modified` list and objective only name `anime_v2.go`'s `getByIDV2`/`GetAnimeDetailV2` path (the current production schema path, `schema.HasSlug=true`).
- Discovered during testing that the poster LATERAL's pre-existing fallback was bare `ma.file_path` (media_assets column), NOT a media_files 'original' row -- there was no media_files join for poster at all before this plan. Pre-backfill-parity test assertions were written to match that actual pre-existing behavior rather than an assumed media_files-original fallback.

## Deviations from Plan

### Auto-fixed Issues

None required beyond the test-infrastructure additions below (which are test-authoring scaffolding, not production-code deviations).

**1. [Process] Test fixture schema construction required iterative discovery of GetByID's full read path**
- **Found during:** Task 2 RED-phase test authoring
- **Issue:** `AnimeRepository.GetByID`'s V2 path transitively calls `loadAnimeEpisodes` (needs an `episodes` table), `loadNormalizedAnimeMetadata` (needs `anime_genres`/`genres`/`genre_names`/`anime_tags`/`tags`/`tag_names`), and anime-source-link lookups (needs `anime_source_links`) -- none of which are obvious from the poster/banner LATERAL alone. Discovered via four successive real-Postgres test-run iterations against a throwaway isolated fixture database.
- **Fix:** Mirrored the already-proven full table set from `anime_public_read_integration_test.go` in the new test file's schema helper.
- **Files modified:** `backend/internal/repository/anime_display_variant_test.go`
- **Committed in:** `1c3ed0cb` (test commit)

## Issues Encountered
- A pre-existing, unrelated test failure surfaced during the full `./internal/repository/...` sanity run beyond this plan's own scoped `<verify>` commands: `TestFansubRepository_PublicProfileSourceInvariants` fails with a stale source-text substring check (`"FROM anime_media am"` expected inside `fansub_repository.go`'s own source) that predates this plan -- that SQL fragment lives in `fansub_project_artwork.go` (a separate file extracted in an earlier, not-yet-committed revision of this phase), and `fansub_repository.go` itself is untouched by this plan's diff. Confirmed via `git stash` that the string's absence is identical with and without this plan's changes. Logged to `deferred-items.md`, not fixed (out of scope per the executor's scope-boundary rule; also a CLAUDE.md-"Verboten" source-text pattern that should be replaced, not extended, by whichever future plan touches that test).
- Many other failures in the same full-package sanity run are pre-existing and environmental (missing `TEAM4S_PHASE128_TEST_DSN`, missing `scripts/member-profile-fixture.manifest.json` in the throwaway container, no network path to the Keycloak container, a missing `episode_type_source`/`filler_source` column from a migration not applied in this disposable container, a permissions-cache startup fragment). None touch `theme_segment_preview.go`, `anime_v2.go`, `anime_assets.go`, or `fansub_project_artwork.go`. This plan's own scoped `<verify>` command set (`-run "TestResolveThemeSegmentPreview|TestResolveThemeSegmentPreviewAssetsBatch|TestGetAnimeDetail|TestGetResolvedAssets|TestListPublicFansubProjects"` plus the new display-variant tests) is fully green.
- No Go toolchain is available directly on `team4s-linux`, and `team4sv30-backend` does not bind-mount `./backend` (confirmed via `docker inspect`) -- tests for this plan were run via a throwaway `golang:1.25-alpine` container bind-mounting `./backend` and `./database/migrations` directly (container removed after use), with two temporary isolated Postgres databases (`team4s_phase117_test_17309`, `team4s_phase106_test_17309`) created on `team4sv30-db` for `TEAM4S_PHASE117_TEST_DSN`/`TEAM4S_PHASE106_TEST_DSN`, both dropped after verification completed.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- All four display-preference fixes land under their existing field names with zero new API surface; 173-13/173-14's frontend consumption plans and 173-16's live D-13 UAT measurement can proceed without further backend changes to these sites.
- No regressions introduced: `go build ./...` and `go vet ./...` both clean; the plan's exact verification grep (`v1\.\(GET\|POST\|PUT\|DELETE\)` count) is unchanged at 98.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

All 6 claimed files found on disk; all 4 claimed commits (`b9a2dda6`, `952e447d`, `1c3ed0cb`, `37245186`) found in git log.
