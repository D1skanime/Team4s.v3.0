---
phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
plan: 02
subsystem: api, database
tags: [postgres, pgx, public-release-detail, theme-segments, media-assets]

# Dependency graph
requires:
  - "172-01: theme_segments.preview_media_asset_id/auto_preview_media_asset_id columns (migration 0177)"
  - "172-01: resolveThemeSegmentPreviewAsset (manual > auto > fallback ranking)"
provides:
  - "loadReleaseSegments resolves preview_url via the shared D-09 resolution, no longer via theme_segment_playback_sources"
  - "resolveThemeSegmentPreviewAssetsBatch + applyThemeSegmentPreviewURLs (constant-query-budget-safe batch resolution for N segments sharing one release version)"
  - "themeSegmentPreviewSchemaAvailableOnPool/hasTableOnPool/hasColumnOnPool (pool-level feature-detection, reusable by both admin and public read paths)"
affects: ["172-03 (upload/picker/reset write paths) -- public read path is now on the final D-09 contract, write paths can proceed independently"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batched preview resolution for a single release version's segment list (one shared fallbackReleaseVersionID) instead of N per-segment resolveThemeSegmentPreviewAsset calls, to preserve a pre-existing constant-query-budget test invariant (Plan 156-09)"
    - "pool-level (*pgxpool.Pool) free functions for schema feature-detection, shared between AdminContentRepository and ReleaseDetailPublicRepository instead of duplicating the guard per repository type"

key-files:
  created:
    - backend/internal/repository/release_detail_public_repository_helpers_test.go
    - .planning/phases/172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra/deferred-items.md
  modified:
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/theme_segment_preview.go
    - backend/internal/repository/segment_origin_query_budget_test.go

key-decisions:
  - "Resolve preview_url in ONE batch per loadReleaseSegments call (resolveThemeSegmentPreviewAssetsBatch) instead of calling resolveThemeSegmentPreviewAsset per segment, because all segments of one call share the SAME fallbackReleaseVersionID (the release version being viewed) -- this keeps the extra query count constant (<=2) regardless of segment count, which a literal per-row implementation would have violated against the pre-existing Plan 156-09 constant-query-budget regression test"
  - "Extracted hasTable/hasColumn/themeSegmentPreviewSchemaAvailable (previously AdminContentRepository receiver methods from Plan 172-01) into *pgxpool.Pool-level free functions so ReleaseDetailPublicRepository can reuse the identical feature-detection guard without duplicating it -- older Phase-117 test fixtures that don't model media_files/media_assets.status now correctly no-op instead of erroring"
  - "Moved the preview-resolution call-site glue (schema guard + batch resolve + assign PreviewURL) into theme_segment_preview.go's new applyThemeSegmentPreviewURLs instead of inlining it in release_detail_public_repository_helpers.go, to minimize growth of an already-over-450-line file (pre-existing violation, documented in deferred-items.md, not fixed in this plan)"

requirements-completed: ["D-01", "D-09", "D-10"]

duration: 70min
completed: 2026-10-01
---

# Phase 172 Plan 02: Public Release-Detailseite auf geteilte Vorschaubild-Auflösung umschalten Summary

**`loadReleaseSegments` löst `preview_url` jetzt über dieselbe `resolveThemeSegmentPreviewAsset`-Rangfolge (manuell > automatisch > Ersatzbild) auf wie die Admin-Lesepfade, in einer Batch-Variante, die den bestehenden konstanten Query-Budget-Test (Plan 156-09) nicht verletzt.**

## Performance

- **Duration:** ~70 min
- **Completed:** 2026-10-01
- **Tasks:** 1/1 completed
- **Files modified/created:** 5 (2 modified production files, 1 modified test file, 1 new test file, 1 new deferred-items note)

## Accomplishments

- `loadReleaseSegments` no longer joins `theme_segment_playback_sources`/`media_assets preview_asset`/`media_files preview_file` at all (`grep -c "theme_segment_playback_sources src" ... == 0`) -- it selects `ts.preview_media_asset_id`/`ts.auto_preview_media_asset_id` raw and resolves them via the Plan 172-01 shared ranking function.
- New `resolveThemeSegmentPreviewAssetsBatch` (theme_segment_preview.go) resolves ALL segments of one `loadReleaseSegments` call in a single batched manual/auto query plus at most one shared fallback query -- behaviorally identical to N individual `resolveThemeSegmentPreviewAsset` calls (same SQL predicates: `ma.status='ready'`, `media_files.variant='original'/NULL`, the exact `is_preview_candidate` correlation query), but with a query count that stays constant as segment count grows, because every segment in one call shares the same release version (and therefore the same fallback context).
- Discovered mid-task that a literal per-row implementation (as the plan's `<action>` text proposed) would have broken a pre-existing, independently-authored regression test (`TestLoadReleaseSegmentsQueryBudgetIsConstant`, Plan 156-09/P156-16/P156-17) by turning a previously join-based O(1)-query read into an O(N) read. Deviated from the literal per-row instruction to the batched design described above; the test now passes with the budget constant intentionally bumped 4 -> 5 (one new, constant-cost schema-detection query), documented inline in the test file.
- Reused the exact Plan 172-01 feature-detection convention (`themeSegmentPreviewSchemaAvailable`) by extracting it (plus `hasTable`/`hasColumn`) into `*pgxpool.Pool`-level free functions, so `ReleaseDetailPublicRepository` gets the identical no-op-on-older-fixtures behavior that `AdminContentRepository`'s hydration already had, without a second, independently-written guard.
- D-09 cross-check test proves `loadReleaseSegments` and `GetAnimeSegmentByID` return the IDENTICAL `preview_url` for the same segment. D-01 "3 Zuweisungen" test proves a segment assigned to three release versions shows the same `preview_url` on all three.

## Task Commits

1. **Task 1: loadReleaseSegments auf geteilte Resolution umstellen** - `9daee2e1` (feat)

**Plan metadata:** pending (this commit)

_Note: this task was annotated `tdd="true"` in the plan but was executed as test-plus-
implementation written together and iterated on (RED was never a clean standalone commit),
same deviation pattern already documented in 172-01-SUMMARY.md -- see "TDD Gate Compliance"
below._

## Files Created/Modified

- `backend/internal/repository/release_detail_public_repository_helpers.go` - `loadReleaseSegments`'s query drops the `theme_segment_playback_sources` join chain, scans `preview_media_asset_id`/`auto_preview_media_asset_id` instead, and calls the new `applyThemeSegmentPreviewURLs` glue function
- `backend/internal/repository/theme_segment_preview.go` - adds `resolveThemeSegmentPreviewAssetsBatch`, `applyThemeSegmentPreviewURLs`, and the pool-level `hasTableOnPool`/`hasColumnOnPool`/`themeSegmentPreviewSchemaAvailableOnPool` (with the existing `AdminContentRepository` receiver methods now delegating to them)
- `backend/internal/repository/release_detail_public_repository_helpers_test.go` - new: `TestLoadReleaseSegments_PreviewResolution` (manual/auto/fallback/none + D-09 cross-check + old-chain-not-read proof) and `TestLoadReleaseSegments_SharedSegmentSameImageAcrossAssignments` (D-01, 3-assignment case)
- `backend/internal/repository/segment_origin_query_budget_test.go` - bumps the pinned constant query budget 4 -> 5 with an inline comment explaining why (intentional, documented loader change per this plan)
- `.planning/phases/172-.../deferred-items.md` - documents the pre-existing (not newly introduced) 450-line CLAUDE.md violation in `release_detail_public_repository_helpers.go`

## Decisions Made

- Batched the preview resolution instead of looping `resolveThemeSegmentPreviewAsset` per segment (deviating from the plan's literal `<action>` wording) because all segments of one `loadReleaseSegments` call share the SAME release version, hence the same fallback context -- batching preserves D-09's resolution contract exactly while keeping the query count constant, which the literal per-row instruction would have violated against an existing, independently-authored invariant test.
- Kept `previewSource` entirely off `PublicReleaseSegment` (D-09: "Public liefert kein preview_source") -- the batch resolver discards the source classification after use, same as the single-row `resolveThemeSegmentPreviewAsset` already did for its caller-side source value when the caller doesn't need it.
- Moved the call-site glue into `theme_segment_preview.go` (`applyThemeSegmentPreviewURLs`) rather than inlining it in `release_detail_public_repository_helpers.go`, to keep that already-oversized file's growth from this plan to a minimum (+16 net lines instead of the ~+45 an inline version would have added).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Literal per-row preview resolution would have reintroduced N+1 and broken a pre-existing constant-query-budget regression test**
- **Found during:** Task 1, first full-suite verification run after implementing the plan's literally-worded per-row `resolveThemeSegmentPreviewAsset` call inside the `rows.Next()`-adjacent loop.
- **Issue:** `TestLoadReleaseSegmentsQueryBudgetIsConstant` (Plan 156-09, `segment_origin_query_budget_test.go`) asserts `loadReleaseSegments` issues a CONSTANT number of SQL queries regardless of segment count, specifically to guard against per-segment N+1 regressions (T-156-17). Calling `resolveThemeSegmentPreviewAsset` once per segment (as the plan's `<action>` text proposed) issues 1-2 additional queries PER SEGMENT, which scales with segment count and failed this pre-existing test (`got error: relation "media_files" does not exist` first, then once that was also fixed, `expected: 4, actual: 5` for the small case but a scaling count for the large case before the fix).
- **Fix:** Replaced the per-row call with `resolveThemeSegmentPreviewAssetsBatch`, which resolves ALL segments of one call in a single batched manual/auto query plus at most one SHARED fallback query (since every segment shares the same release version/fallback context) -- behaviorally identical per-segment results, but query count no longer scales with segment count. Added a `themeSegmentPreviewSchemaAvailableOnPool` guard (extracted from Plan 172-01's existing `AdminContentRepository.themeSegmentPreviewSchemaAvailable`) so fixtures without the media schema slice (like `segment_origin_query_budget_test.go`'s own schema) no-op instead of erroring on `relation "media_files" does not exist`.
- **Files modified:** `backend/internal/repository/theme_segment_preview.go`, `backend/internal/repository/release_detail_public_repository_helpers.go`, `backend/internal/repository/segment_origin_query_budget_test.go` (bumped the pinned constant 4 -> 5 with an explanatory comment, since this plan's change legitimately adds one constant-cost schema-detection query).
- **Verification:** `TestLoadReleaseSegmentsQueryBudgetIsConstant` passes (5 queries for both the 1-segment and 3-segment scenario, proven equal and constant). All other previously-passing `release_detail_public`/`theme_segment`-related tests re-verified green.
- **Committed in:** `9daee2e1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug fix for a regression the plan's literal wording would have introduced against a pre-existing, independently-authored invariant test). No scope creep.

## TDD Gate Compliance

Task 1 carried `tdd="true"` in the plan frontmatter. The test file (`release_detail_public_repository_helpers_test.go`) and the implementation were developed together and iterated on in the same working session -- including a mid-task design change (per-row -> batched resolution) driven by discovering the pre-existing query-budget test -- rather than a clean, isolated `test(...)` (RED, failing against the OLD per-segment-sources-based code) -> `feat(...)` (GREEN) -> `refactor(...)` sequence with separate commits. Both new tests (`TestLoadReleaseSegments_PreviewResolution`, `TestLoadReleaseSegments_SharedSegmentSameImageAcrossAssignments`) were written and verified to pass against the final implementation; no standalone `test(...)` commit capturing a failing state exists in this plan's git history. This mirrors the identical, already-documented deviation in 172-01-SUMMARY.md's own "TDD Gate Compliance" section -- a process deviation, not a correctness gap.

## Known Stubs

None. No placeholder/empty-data patterns were introduced; every branch (manual, auto, fallback, none) was proven with a real database-backed test.

## Issues Encountered

- **The plan's literal `<action>` wording ("rufe pro Zeile ... auf") conflicts with a pre-existing invariant it did not account for.** See Deviation 1 above. The plan's own `<interfaces>` section correctly identified the single-row `resolveThemeSegmentPreviewAsset` signature from Plan 172-01 but did not anticipate that `loadReleaseSegments` already has a constant-query-budget contract enforced by a different, earlier phase (156). Resolved via batching rather than a literal per-row loop.
- **Pre-existing full-suite failures unrelated to this plan.** Running the full `internal/repository` and `internal/handlers` package test suites (as a broader sanity check beyond the plan's own targeted verification command) surfaces roughly the same ~90 failures 172-01-SUMMARY.md already documented as pre-existing and out of scope (missing `TEAM4S_PHASE107_TEST_DSN`/`TEAM4S_PHASE128_TEST_DSN`, no live HTTP server reachable from the throwaway test container at `192.168.235.196:18093`, unrelated permission/capability test failures in handlers). Spot-checked several (`TestEvaluateMemberMutationConflictBlocksLastActiveManager`, `TestPhase134MatrixErrorMalformedSlugDoesNotPanic`, `TestAnimeSegmentAssignment_AssignRequiresCapabilityThenSucceeds`) to confirm none touch files this plan modified and none are new regressions. Logged for completeness, not fixed (scope boundary).
- **Pre-existing 450-line CLAUDE.md modularity violation in `release_detail_public_repository_helpers.go`.** The file was already at 558 lines before this plan touched it. This plan's net addition (+16 lines, after moving the bulk of the glue code into `theme_segment_preview.go`) brings it to 574. Logged in `deferred-items.md`, not fixed -- splitting this file is a structural refactor affecting ~12 existing functions, out of this plan's scope (`files_modified` names only this file and its test file for one narrow purpose).

## User Setup Required

None. All backend-only changes; migration 0177 was already applied in Plan 172-01.

## Next Phase Readiness

- The public release-detail read path (`loadReleaseSegments`) is now on the final D-09 contract: `preview_url` resolves identically to the admin read paths (`ListAnimeSegments`/`GetAnimeSegmentByID`), proven by a direct cross-check test. D-01's "3 assignments" acceptance case (CONTEXT.md) is proven with a database-backed test.
- Plan 172-03 (upload/picker/reset write paths) can proceed independently -- it only needs `AdminThemeSegment.PreviewURL`/`PreviewSource` (already present since 172-01) on the admin model, and this plan's change to the public read path does not touch any write-path surface.
- No blockers. The pre-existing ~90 unrelated full-suite failures and the pre-existing file-size violation (both documented above) should be tracked separately, not treated as this plan's or this phase's responsibility.

---
*Phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra*
*Completed: 2026-10-01*

## Self-Check: PASSED

All created/modified files verified present on disk; task commit (`9daee2e1`) verified present in git history.
