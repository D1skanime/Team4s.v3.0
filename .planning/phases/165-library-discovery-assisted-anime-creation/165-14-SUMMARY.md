---
phase: 165-library-discovery-assisted-anime-creation
plan: 14
subsystem: api
tags: [go, gin, jellyfin, episode-import, pgx]

# Dependency graph
requires:
  - phase: 165-04
    provides: "D-14 folder-selector wiring (jellyfin_series_id request field, rejectUnownedJellyfinSeriesID fail-closed ownership guard)"
provides:
  - "resolveEpisodeImportFolderFilterPath: single-lookup folder-path resolution for PreviewEpisodeImport, used only when an explicit non-main jellyfin_series_id is selected"
  - "GAP-07 (165-UAT.md) closed: episode-import preview for an explicitly-selected, additionally-connected Jellyfin folder now returns that folder's own episodes"
affects: [165-17 (GAP-05, additive-connect flow that populates the two-folder state this fix consumes), 165-UAT.md]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling-file extraction to keep an already-oversized handler file from growing further (admin_episode_import_ownership.go precedent, reused here for admin_episode_import_folder_filter.go)"

key-files:
  created:
    - backend/internal/handlers/admin_episode_import_folder_filter.go
    - backend/internal/handlers/admin_episode_import_folder_filter_test.go
  modified:
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_episode_import_ownership_test.go

key-decisions:
  - "Extracted the new resolution helper into a new sibling file (admin_episode_import_folder_filter.go) rather than inline in admin_episode_import.go, per the plan's own fallback instruction, since admin_episode_import.go was already at 771 lines pre-plan."
  - "Reused the existing 502 Bad Gateway / German error-message format for the new getJellyfinSeriesByID failure path, matching the pre-existing loadEpisodeImportMediaCandidates error handling exactly."

patterns-established: []

requirements-completed: [REQ-165-14, REQ-165-13]

# Metrics
duration: 12min
completed: 2026-09-22
---

# Phase 165 Plan 14: Episode-Import Folder-Scoped Preview Fix (GAP-07) Summary

**Fixed PreviewEpisodeImport to filter media candidates by the explicitly-selected Jellyfin folder's own path (via a single getJellyfinSeriesByID lookup) instead of unconditionally reusing the anime's main folder path, which previously discarded every episode of an additionally-connected folder.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-22T10:47:35Z
- **Completed:** 2026-09-22T10:59:00Z
- **Tasks:** 1
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Root-caused and fixed GAP-07 (165-UAT.md): selecting a second, explicitly-connected Jellyfin folder (D-14 selector) in the episode-import preview no longer returns an empty result.
- Added `resolveEpisodeImportFolderFilterPath`: resolves the correct folder-filter path, calling `getJellyfinSeriesByID` exactly once (never per-episode) only when an explicit, non-main folder is selected; falls back to `nil` (no local filter — safe because `listJellyfinEpisodes` already scopes the fetch server-side) when the lookup finds nothing.
- Verified zero-regression for the main-folder case (both omitted and explicit `jellyfin_series_id`): zero extra `/Items` requests, byte-identical `media_candidates`.
- Updated one pre-existing ownership test (`TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard`) whose fake server only handled a single request path; it now correctly asserts both the new `/Items` lookup and the existing `/Shows/.../Episodes` fetch for the non-main-folder case it already exercised.

## Task Commits

1. **Task 1: Filter episode-import preview by the explicitly-selected folder's own path** - `84a92c14` (fix)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `backend/internal/handlers/admin_episode_import_folder_filter.go` - New sibling file with `resolveEpisodeImportFolderFilterPath`
- `backend/internal/handlers/admin_episode_import_folder_filter_test.go` - 3 new tests (explicit-additional-folder success, main-folder omitted regression, main-folder explicit regression)
- `backend/internal/handlers/admin_episode_import.go` - `PreviewEpisodeImport` now resolves the folder-filter path via the new helper instead of unconditionally passing `contextResult.FolderPath`
- `backend/internal/handlers/admin_episode_import_ownership_test.go` - Updated `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard` fake server to route both `/Items` and `/Shows/.../Episodes` requests

## Decisions Made
- Followed the plan's own fallback instruction: extracted the new helper to a sibling file (`admin_episode_import_folder_filter.go`) instead of inlining it in `admin_episode_import.go`, mirroring the existing `admin_episode_import_ownership.go` precedent.
- Reused the exact same 502/German-error-message shape used by the pre-existing `loadEpisodeImportMediaCandidates` error path for the new `getJellyfinSeriesByID` failure branch, so error handling stays consistent for callers/logs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated a pre-existing ownership test whose fake server did not anticipate the new, correct extra `/Items` request**
- **Found during:** Task 1 verification (`go test ./internal/handlers/... -run TestPreviewEpisodeImport`)
- **Issue:** `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard` (in `admin_episode_import_ownership_test.go`, written in an earlier plan 165-04) asserted the fake Jellyfin server received exactly 1 request and required every request's path to equal `/Shows/series-402/Episodes`. This test exercises exactly the "explicit, non-main folder" scenario that this plan's fix now correctly issues one additional `getJellyfinSeriesByID` (`/Items`) call for (per the plan's own Test 3 acceptance criterion, which explicitly permits this for the non-main case). The old assertion started failing with an `EOF` from the fake server once the second, unhandled path arrived.
- **Fix:** Updated the fake server to route on `r.URL.Path`, tracking `itemsRequests` and `episodesRequests` separately, and asserting both are exactly 1 for this genuinely-non-main-folder case. The test's original intent (ownership guard allows a genuinely connected folder and proceeds to Jellyfin) is preserved and strengthened.
- **Files modified:** `backend/internal/handlers/admin_episode_import_ownership_test.go`
- **Verification:** `go test ./internal/handlers/... -run TestPreviewEpisodeImport -v` — all 7 `TestPreviewEpisodeImport*` tests pass; full `go test ./internal/handlers/...` package passes.
- **Committed in:** `84a92c14` (same commit as Task 1, since this update is inseparable from the behavior change it verifies)

**2. [Minor, documented, not corrected] `admin_episode_import.go` grew by 4 lines (771 → 775) despite the plan's sibling-file extraction**
- **Found during:** Task 1 acceptance-criteria check (`wc -l`)
- **Issue:** The plan's acceptance criteria state the file "does not exceed its pre-plan line count (771) net of the new helper; if it would, the helper is extracted to a new sibling file instead." The helper WAS extracted to a new sibling file (`admin_episode_import_folder_filter.go`) as instructed, but the minimal call-site glue inside `PreviewEpisodeImport` itself (resolving the folder-filter path and handling its `ok` return before calling `loadEpisodeImportMediaCandidates`) unavoidably adds 4 net lines over the single line it replaced, since Go's explicit early-return error handling cannot express this in fewer lines without harming readability or duplicating the existing error-response block.
- **Assessment:** Not corrected — 775 lines is a negligible, unavoidable overage (+0.5%) given the constraint's real intent (avoid inlining ~20 lines of new helper logic) was fully honored. CLAUDE.md's hard 450-line production-file limit is a separate, pre-existing violation for this file (unrelated to this plan; the file was already 771 lines before any 165-14 change) and out of this plan's scope to fix.
- **Files affected:** `backend/internal/handlers/admin_episode_import.go`

---

**Total deviations:** 2 (1 auto-fixed test update, 1 documented minor line-count note)
**Impact on plan:** Both are minor and directly caused by faithfully implementing the plan's own specified behavior (Test 3's "one extra request only for the non-main case" and the sibling-file extraction fallback). No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## Tests Run (exact names, package, result)

All run against the real Postgres test database (`team4s_phase117_test_164` on `team4sv30-db`, via `TEAM4S_PHASE117_TEST_DSN`, from a `golang:1.25-alpine` container attached to the `team4s_default` Docker network — DSN gate confirmed satisfied, no tests skipped for missing DSN).

**Package `team4s.v3/backend/internal/handlers`, `go test ./internal/handlers/... -run TestPreviewEpisodeImport -v`:**

| Test | Result |
|---|---|
| `TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes` (new) | PASS |
| `TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged` (new) | PASS |
| `TestPreviewEpisodeImport_ExplicitMainFolderIDStaysUnchanged` (new) | PASS |
| `TestPreviewEpisodeImport_RejectsUnownedJellyfinSeriesIDBeforeAnyJellyfinCall` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_NoRequestedSeriesIDBehavesUnchanged` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_SingleFolderOwnedSeriesIDPassesGuard` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard` (pre-existing, updated) | PASS |
| `TestPreviewEpisodeImport_SeparatesCanonicalEpisodesAndMediaCandidates` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_AccumulatesSeasonSplitEpisodeSuggestions` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_AddsManualSeasonOffsetAfterSeasonAccumulation` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_ExpandsFilenameEpisodeRangesAcrossSeasonOffsets` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_FallsBackToFilenameEpisodeWhenJellyfinIndexIsMissing` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_MappingRowsCarryReadableFileEvidence` (pre-existing) | PASS |
| `TestPreviewEpisodeImport_PrefillsDetectedFansubGroupNames` (pre-existing) | PASS |

**Full package, `go test ./internal/handlers/...` (all tests, package-wide, includes the above plus every other handler test):** `ok  team4s.v3/backend/internal/handlers  9.186s` — all PASS, 0 failures.

**`go build ./...`:** succeeds, `BUILD_OK`.

**`go vet ./...`:** clean, no findings.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GAP-07 is closed; the D-14 folder-selector UI (already wired in 165-04) now behaves correctly end-to-end once GAP-05 (165-17, additive-connect flow) makes a real two-folder anime reachable in production.
- No blockers for the remaining gap-closure plans in this round (165-15..165-19).

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-22*

## Self-Check: PASSED

All created/modified files verified present on disk; task commit `84a92c14` verified present in `git log`.
