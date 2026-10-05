---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 19
subsystem: api
tags: [go, pgx, repository-pattern, anime-assets, refactoring]

# Dependency graph
requires:
  - phase: 174-14
    provides: same-package/same-struct D-15 split precedent (admin fansub create page split), confirming the file-sibling shape to replicate
provides:
  - anime_assets_cover.go (Cover legacy+V2 pair, ApplyProviderCover)
  - anime_assets_banner_logo.go (Banner+Logo legacy+V2 pairs)
  - anime_assets_background.go (Background plural R/W legacy+V2 pair)
  - anime_assets_background_video.go (Background-video singular slot legacy+V2 pair)
  - anime_assets_background_reconcile.go (provider-reconciliation plan builder for the background slot)
  - anime_assets_provider.go (generic V2 media-link dispatch infra shared across cover/banner/logo/background_video)
  - anime_assets_resolve.go (generic URL/pointer resolution utilities)
  - anime_assets.go reduced from 1880 to 400 lines, struct/constructor + cross-type resolver + schema helpers intact
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-15 same-package/same-receiver repository split by asset type (not legacy-vs-V2): each sibling file keeps a type's legacy method and its V2 shadow method together, since they target different underlying schemas (RESEARCH.md Pitfall 4) rather than being D-07 duplication"
    - "Generic V2 dispatch helpers shared across 3+ asset types (applyProviderSingularAssetV2/assignManualSingularAssetV2/clearSingularAssetV2 and their primitives) extracted into a dedicated anime_assets_provider.go that type-specific sibling files call into as same-package functions"
    - "CLAUDE.md's 450-line modularity ceiling overrides a plan's literal single-file grouping instruction when the grouped cluster would otherwise exceed it -- surfaced here as a further 3-way split of the 'background(+video)' cluster and a 1-way split of generic resolve helpers out of the retained core file"

key-files:
  created:
    - backend/internal/repository/anime_assets_cover.go
    - backend/internal/repository/anime_assets_banner_logo.go
    - backend/internal/repository/anime_assets_background.go
    - backend/internal/repository/anime_assets_background_video.go
    - backend/internal/repository/anime_assets_background_reconcile.go
    - backend/internal/repository/anime_assets_provider.go
    - backend/internal/repository/anime_assets_resolve.go
  modified:
    - backend/internal/repository/anime_assets.go
    - backend/internal/repository/anime_assets_test.go
    - backend/internal/repository/runtime_authority_test.go

key-decisions:
  - "applyProviderSingularAssetV2/assignManualSingularAssetV2/clearSingularAssetV2 are called by logo, banner-V2, and background_video-V2 (confirmed via grep across all call sites before moving anything) -- genuinely shared across 3 asset-type clusters, so they and their supporting primitives (loadV2AnimeMediaIDByRef, upsertAnimeMediaLink, removeAnimeMediaLinksByType, hasManualAnimeMediaByType, ensureProviderAnimeMediaV2, providerAnimeMediaMetadata, loadAnimeMediaTypeID, the animeAssetLinkSpec table) went into a dedicated anime_assets_provider.go per the plan's own suggested pattern, rather than being duplicated into cover.go/banner_logo.go/background_video.go"
  - "addManualPluralAssetV2 has exactly one caller (AddManualBackgroundVideo) despite its generic-sounding name -- grep-confirmed background_video-only, so it stayed with the background-video cluster rather than moving to the provider-generic file"
  - "lockAnimeRow and the derefString/normalizeNullableTrimmedString/resolveAnime*/resolveV2AssetOwnership utilities are called across every asset-type cluster (cover, banner_logo, background, background_video, provider) -- kept as core/shared per the plan's own stated principle for GetResolvedAssets and the schema-detection helpers, but lockAnimeRow stayed in anime_assets.go while the smaller pointer/URL utilities were moved to a new anime_assets_resolve.go once keeping them in anime_assets.go would have pushed that file over the 450-line ceiling"
  - "The background(+video) cluster the plan grouped into one anime_assets_background.go sibling would have been 596 lines -- over CLAUDE.md's 450-line ceiling. Per CLAUDE.md enforcement (project rules take precedence over plan instructions), it was further split by the plan's own stated distinction between the plural background collection and the singular background_video slot: anime_assets_background.go (plural R/W, 396 lines), anime_assets_background_video.go (singular slot, 108 lines), and anime_assets_background_reconcile.go (the provider-reconciliation plan builder + types + upsertBackgroundMediaExternal, 127 lines, used by both legacy and V2 ApplyProviderBackgrounds paths in the background.go file)"

requirements-completed: [D-15, D-07, D-17, D-02, D-19, D-22]

# Metrics
duration: 48min
completed: 2026-10-05
---

# Phase 174 Plan 19: Anime Assets Cover/Banner+Logo/Background/Provider Split Summary

**Split the 1,880-line `anime_assets.go` hotspot (34 methods) by asset type into 7 sibling files -- cover, banner+logo, background, background-video, a background-reconciliation helper file, a shared V2-dispatch-generic file, and a shared URL/pointer-resolution file -- with every legacy/V2 method pair kept intact and co-located per RESEARCH.md's explicit warning that they target different schemas, not D-07 duplication.**

## Performance

- **Duration:** 48 min
- **Started:** 2026-10-05T15:30:00Z
- **Completed:** 2026-10-05T16:18:00Z
- **Tasks:** 2
- **Files modified:** 10 (7 created, 3 modified)

## Accomplishments
- `anime_assets_cover.go` (377 lines): `AssignManualCover`/`ClearCover`/`ClearCoverWithResult`/`assignManualCoverV2`/`clearCoverV2`/`ApplyProviderCover` plus cover-only helpers `removeAnimePosterAssetsV2`/`syncLegacyAnimeCoverImageV2`
- `anime_assets_banner_logo.go` (198 lines): `AssignManualBanner`/`ClearBanner`/`AssignManualLogo`/`ClearLogo`/`ApplyProviderBanner`/`ApplyProviderLogo`/`assignManualBannerV2`/`clearBannerV2`/`applyProviderBannerV2`
- `anime_assets_background.go` (396 lines): `AddManualBackground`/`RemoveBackground`/`ApplyProviderBackgrounds`/`addManualBackgroundV2`/`removeBackgroundV2`/`applyProviderBackgroundsV2`/`loadNextAnimeMediaSortOrderByType`
- `anime_assets_background_video.go` (108 lines): `AssignManualBackgroundVideo`/`AddManualBackgroundVideo`/`ClearBackgroundVideo`/`ApplyProviderBackgroundVideo`/`addManualPluralAssetV2`
- `anime_assets_background_reconcile.go` (127 lines): `reconcileAnimeProviderBackgrounds` + `storedAnimeBackgroundAsset`/`animeProviderBackgroundUpdate`/`animeProviderBackgroundInsert`/`animeProviderBackgroundPlan` + `upsertBackgroundMediaExternal`
- `anime_assets_provider.go` (299 lines): `applyProviderSingularAssetV2`/`assignManualSingularAssetV2`/`clearSingularAssetV2`, `animeAssetLinkSpec`/`animeAssetLinkSpecs`/`lookupAnimeAssetLinkSpec`/`validateAnimeAssetLinkMediaType`, `loadV2AnimeMediaIDByRef`, `upsertAnimeMediaLink`, `removeAnimeMediaLinksByType`, `hasManualAnimeMediaByType`, `ensureProviderAnimeMediaV2`, `providerAnimeMediaMetadata`, `loadAnimeMediaTypeID`
- `anime_assets_resolve.go` (79 lines): `resolveAnimeBannerAsset`/`resolveAnimeResolvedAsset`/`resolveAnimeAssetURL`/`normalizeNullableTrimmedString`/`derefString`/`resolveV2AssetOwnership`
- `anime_assets.go` reduced from 1880 to 400 lines; struct `AnimeAssetRepository`, constructor `NewAnimeAssetRepository`, `GetResolvedAssets`/`getResolvedAssetsV2` (cross-asset-type resolver), `lockAnimeRow`, and the schema-detection helpers `hasV2AssetSchema`/`hasAnimeMediaTable`/`ensureAnimeMediaAsset` -- exactly 5 receiver methods, matching the plan's acceptance criterion
- Every one of the 7 resulting files is at or under the project's 450-line modularity ceiling
- `go build ./...` clean after every task; `go test ./internal/repository/... -run TestAnimeAsset -v` and the DSN-gated `TestAssignManualCoverV2_LegacyCoverImageStoresOriginalNotDisplay`/`TestClearCoverV2_RemovedPathPrefersOriginalOverDisplay` all pass unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the cover and banner+logo asset-type clusters** - `94368d62` (refactor)
2. **Task 2: Extract the background cluster, finalize, and run the full gate** - `b82581c1` (refactor)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/repository/anime_assets_cover.go` - cover legacy+V2 pair (new)
- `backend/internal/repository/anime_assets_banner_logo.go` - banner+logo legacy+V2 pairs (new)
- `backend/internal/repository/anime_assets_background.go` - background (plural) legacy+V2 pair (new)
- `backend/internal/repository/anime_assets_background_video.go` - background-video (singular) legacy+V2 pair (new, see Deviations)
- `backend/internal/repository/anime_assets_background_reconcile.go` - provider-reconciliation plan builder for background (new, see Deviations)
- `backend/internal/repository/anime_assets_provider.go` - generic V2 media-link dispatch infra shared across cover/banner/logo/background_video (new)
- `backend/internal/repository/anime_assets_resolve.go` - generic URL/pointer resolution utilities (new, see Deviations)
- `backend/internal/repository/anime_assets.go` - shrunk from 1880 to 400 lines; struct/constructor, cross-type resolver, and schema helpers intact
- `backend/internal/repository/anime_assets_test.go` - 1 self-inspection test's `os.ReadFile` target updated (see Deviations)
- `backend/internal/repository/runtime_authority_test.go` - 1 self-inspection test's fragment-source concatenation updated (see Deviations)

## Decisions Made
- **Generic V2 dispatch helper placement:** grepped every call site of `applyProviderSingularAssetV2`, `assignManualSingularAssetV2`, `clearSingularAssetV2`, and `addManualPluralAssetV2` before moving anything, per the plan's explicit instruction. The first three are called by logo, the banner V2 shadow, and the background_video V2 shadow -- genuinely shared across 3 asset-type clusters -- so they and their load-bearing primitives went into a new `anime_assets_provider.go`. `addManualPluralAssetV2` has exactly one caller (`AddManualBackgroundVideo`), so it stayed with the background-video cluster despite its generic-sounding name.
- **Core-file retention beyond the plan's literal 3-name list:** the plan named `GetResolvedAssets`/`getResolvedAssetsV2`/`hasV2AssetSchema`/`hasAnimeMediaTable`/`ensureAnimeMediaAsset` as staying in the core file "since they are called across every asset type." `lockAnimeRow` meets that exact description too (called from cover, background, background-video-via-provider, and the legacy background path) and was kept in `anime_assets.go` on that basis.
- **450-line ceiling forced a further split beyond the plan's literal file list:** `anime_assets_background.go` as the plan described it (background + background_video + their V2 shadows + the reconciliation helpers) measured 596 lines -- over CLAUDE.md's 450-line ceiling. Per CLAUDE.md enforcement (project rules take precedence over plan instructions when they conflict), this was split along the plan's own explicit plural-vs-singular distinction into `anime_assets_background.go` (plural, 396 lines), `anime_assets_background_video.go` (singular, 108 lines), and `anime_assets_background_reconcile.go` (the shared reconciliation plan builder, 127 lines). `anime_assets.go` itself was also at 464 lines after removing the background/provider clusters; the generic `resolveAnime*`/`derefString`/`normalizeNullableTrimmedString`/`resolveV2AssetOwnership` utilities (which carry no asset-type-specific logic) were moved to a new `anime_assets_resolve.go`, bringing the core file to 400 lines.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - CLAUDE.md modularity constraint] Split the background cluster and the retained core file further than the plan's literal 5-file list, to respect the 450-line ceiling**
- **Found during:** Task 2, immediately after `go build ./...` succeeded on the plan's literal grouping
- **Issue:** The plan's `files_modified` names exactly 5 files (`anime_assets.go`, `anime_assets_cover.go`, `anime_assets_banner_logo.go`, `anime_assets_background.go`, `anime_assets_provider.go`). Grouping the full background(+video) cluster plus its reconciliation helpers into one `anime_assets_background.go` produced 596 lines; the retained `anime_assets.go` core file (struct/constructor/resolver/schema-helpers/lockAnimeRow/resolve-utilities) produced 464 lines. Both exceed CLAUDE.md's "Production code files should stay at or below 450 lines" constraint, which the project context explicitly instructs takes precedence over plan instructions.
- **Fix:** Split `anime_assets_background.go` into three files along the plan's own stated plural-vs-singular distinction (background vs. background_video) plus a dedicated reconciliation-helper file, and split the generic URL/pointer-resolution utilities out of `anime_assets.go` into `anime_assets_resolve.go`. No function was merged, renamed, or had its logic changed -- every move is a verbatim relocation, same as the plan's own cover/banner_logo/background/provider moves.
- **Files added:** `backend/internal/repository/anime_assets_background_video.go`, `backend/internal/repository/anime_assets_background_reconcile.go`, `backend/internal/repository/anime_assets_resolve.go`
- **Verification:** `wc -l` confirms all 7 resulting files are at or under 450 lines (largest is `anime_assets_cover.go` at 377 lines, see exact counts in Accomplishments); `go build ./...` succeeds; `go test ./internal/repository/... -run TestAnimeAsset -v` passes unchanged
- **Committed in:** `b82581c1` (Task 2 commit)

**2. [Rule 1 - Bug, test broken by the planned move] Fixed two pre-existing filename-coupled self-inspection tests**
- **Found during:** Task 1 (`TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone`) and Task 2 (`TestApplyProviderBackgroundsV2LocksOnlyNonNullableRows`)
- **Issue:** Two pre-existing tests (in `runtime_authority_test.go` and `anime_assets_test.go` respectively) use the `os.ReadFile`-based "Teststil Altlast" pattern CLAUDE.md documents as forbidden for new tests but tolerated as pre-existing debt: they read `anime_assets.go` by filename and assert on lowercased source fragments, without executing any code. Since this plan's entire purpose is relocating those exact fragments to new sibling files, both tests broke with zero actual behavior change -- a direct, mechanical consequence of the planned move, not a real regression.
- **Fix:** `TestAnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone` now concatenates the source of `anime_assets.go` + `anime_assets_cover.go` + `anime_assets_banner_logo.go` + `anime_assets_background.go` (the files that now jointly contain the fragments it asserts on) instead of reading only `anime_assets.go`. `TestApplyProviderBackgroundsV2LocksOnlyNonNullableRows` now reads `anime_assets_background.go` instead of `anime_assets.go`. Both are pure source-target adjustments, not logic rewrites -- the same resolution pattern 174-16's SUMMARY documented for an analogous break in the fansub repository split.
- **Files modified:** `backend/internal/repository/runtime_authority_test.go`, `backend/internal/repository/anime_assets_test.go`
- **Verification:** `go test ./internal/repository/... -run 'TestAnimeAsset|TestApplyProviderBackgroundsV2LocksOnlyNonNullableRows' -v` -- both pass
- **Committed in:** `94368d62` (Task 1, for the runtime_authority_test.go fix applicable at that point) and `b82581c1` (Task 2, for the final 4-file concatenation and the anime_assets_test.go fix)

---

**Total deviations:** 2 auto-fixed (1 CLAUDE.md-driven modularity split, 1 test-breakage fix across 2 pre-existing tests)
**Impact on plan:** The additional 3-file split was necessary to comply with CLAUDE.md's file-size ceiling, which the project context says takes precedence over plan instructions; it introduces no new files_modified beyond what the resulting line-count math required, no scope creep, and no behavior change -- every function is still a verbatim relocation. The test fixes are the same class of mechanical, intent-preserving adjustment 174-16 already established as the correct resolution for this exact pre-existing Altlast pattern.

## Issues Encountered
- Local Go toolchain is not installed on the host; all `go build`/`go test` verification ran via `docker exec` into the already-running `team4sv30-backend` container (Go 1.25.13), which is attached to the `team4s_default` network and has the repo bind-mounted at `/app`.
- The DSN-gated legacy-cover-V2 regression tests (`TestAssignManualCoverV2_LegacyCoverImageStoresOriginalNotDisplay`, `TestClearCoverV2_RemovedPathPrefersOriginalOverDisplay`) needed `TEAM4S_PHASE106_TEST_DSN` pointed at the pre-existing `team4s_phase106_test_173` database (reused from a prior phase's isolated-schema fixture, confirmed present via `psql ... pg_database`) since the plan's own `-run TestAnimeAsset` scope does not match their `TestAssignManualCoverV2`/`TestClearCoverV2` name prefixes. Both pass.
- Running the full `./internal/repository/...` package (beyond this plan's targeted `-run` scope) surfaces the same pre-existing, unrelated, environment-dependent failures 174-15's SUMMARY already documented (`TestPhase134Matrix*`, `TestPhase141RevokedDelegationImmediateEffect` -- live backend container not reachable on port 18093, Keycloak dev-password/role-capability config issue in this environment). Confirmed unrelated: none of the failing tests touch any file this plan modified.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `anime_assets.go` and all 6 new sibling files are each at or under the 450-line modularity ceiling; no further split of this hotspot is outstanding.
- Every legacy/V2 method pair across all 4 asset types (cover, banner, logo, background, background_video) remains intact, co-located, and unmodified -- the schema-migration-in-progress duality RESEARCH.md flagged as explicitly out of scope (D-01/D-04) was not touched.
- No blockers. Build and the asset-scoped test suite are green; no documented pre-existing failures intersect this plan's files.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*
