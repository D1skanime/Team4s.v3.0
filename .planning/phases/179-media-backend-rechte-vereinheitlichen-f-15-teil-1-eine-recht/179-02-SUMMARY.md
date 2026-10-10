---
phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
plan: 02
subsystem: api
tags: [go, permissions, handlers, d-06-extraction, authorization]

# Dependency graph
requires:
  - phase: 179-01
    provides: "ActionReleaseThemeAssetUpload permissions.Action constant, registered in allKnownActions with the exact 11-role list release_version_media.upload already has"
provides:
  - "UploadReleaseThemeAsset/UploadReleaseThemeAssetForRelease now authorize via permissions.ActionReleaseThemeAssetUpload instead of the foreign permissions.ActionReleaseVersionMediaUpload action"
  - "AdminContentHandler.persistReleaseThemeAsset, the shared CreateMediaAsset -> InsertMediaFile -> CreateReleaseThemeAsset persistence tail used by both theme-asset upload handlers"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-06 handler persistence extraction into a dedicated _persist.go file, mirroring FansubHandler.persistFansubMediaAsset's shape (success path returns to the caller unwritten; only error responses are written inside the shared method)"

key-files:
  created:
    - backend/internal/handlers/admin_content_release_theme_assets_persist.go
  modified:
    - backend/internal/handlers/admin_content_release_theme_assets.go
    - backend/internal/handlers/admin_content_release_theme_assets_test.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
    - .planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/deferred-items.md

key-decisions:
  - "D-12: both theme-asset upload handlers now check permissions.ActionReleaseThemeAssetUpload exclusively; permissions.ActionReleaseVersionMediaUpload no longer appears anywhere in admin_content_release_theme_assets.go"
  - "D-06: the two ~45-line duplicate persistence blocks collapse into one private AdminContentHandler.persistReleaseThemeAsset method in a new 80-line file, keeping the already-over-limit handler file from growing further (559 -> 492 lines)"
  - "Used models.MediaAssetCreateInput (not repository.MediaAssetCreateInput as the plan's <interfaces> block loosely described) for the shared method's createInput parameter -- the plan's prose was imprecise about the package, but the actual type (confirmed via services.MediaSaveResult.CreateInput) is in the models package"

patterns-established:
  - "Extracted handler persistence tail returns (*Model, bool) with NO response written on success -- caller writes 2xx; only error branches write a response inside the shared method"

requirements-completed: [D-12, D-06]

# Metrics
duration: ~50min
completed: 2026-10-10
---

# Phase 179 Plan 02: Swap theme-asset upload action and extract shared persistence Summary

**Both release-theme-asset upload handlers now authorize via the correctly-named `ActionReleaseThemeAssetUpload` action instead of the foreign `release_version_media.upload`, and their duplicated `CreateMediaAsset -> InsertMediaFile -> CreateReleaseThemeAsset` persistence block now lives once in a new shared method.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-10-10T22:05:00Z (approx.)
- **Completed:** 2026-10-10T22:40:00Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 new persist file, 1 handler file, 2 test files) + 1 deferred-items.md update

## Accomplishments

- `backend/internal/handlers/admin_content_release_theme_assets_persist.go` (80 lines, well
  under the 450-line D-06 ceiling) hosts the new private
  `AdminContentHandler.persistReleaseThemeAsset` method, which both
  `UploadReleaseThemeAsset` and `UploadReleaseThemeAssetForRelease` now call instead of
  duplicating the `CreateMediaAsset -> InsertMediaFile("original", ...) ->
  CreateReleaseThemeAsset` tail inline; `admin_content_release_theme_assets.go` shrinks from
  559 to 492 lines as a result
- Both upload handlers' `CanForFansubGroup`/`CanForRelease` calls now pass
  `permissions.ActionReleaseThemeAssetUpload` instead of the foreign
  `permissions.ActionReleaseVersionMediaUpload`; the old action string no longer appears
  anywhere in `admin_content_release_theme_assets.go`
- A new `releaseThemeAssetProjectLeadResolverStub` plus two new subtests inside
  `TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete` prove, via real httptest
  calls against `loadAppAuthCapabilityTestCache(t)`'s real `RoleProjectLead` fixture (which
  grants the *old* `release_version_media.upload` action but deliberately not the new
  `release_version_theme_asset.upload` action, per Plan 179-01), that an actor with only the
  old action is now denied (403) at both upload endpoints — proving the swap has real effect,
  not an additive grant
- Fixed a pre-existing source-grep test
  (`TestAdminFansubReleases_DirectReleaseThemeUploadHandlerExists`) that Task 1's extraction
  broke: it previously asserted the literal string `adminreleasethemeassetcreateinput{` inside
  `admin_content_release_theme_assets.go`'s own source, which moved to the new persist file; it
  now checks the handler file for the method-call site and the persist file for the moved
  construction

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the shared theme-asset persistence tail into a new file** - `b21df329` (refactor)
2. **Task 2: Swap the permission action at both call sites and prove the swap has real effect** - `2ae23679` (fix)

_No TDD tasks in this plan; both were refactor/correction tasks with real-behavior proof tests._

## Files Created/Modified

- `backend/internal/handlers/admin_content_release_theme_assets_persist.go` - new file, hosts `persistReleaseThemeAsset`
- `backend/internal/handlers/admin_content_release_theme_assets.go` - both handlers call the new shared method; both authorize via the new action; removed now-unused `models`/`log` imports, added `fmt`
- `backend/internal/handlers/admin_content_release_theme_assets_test.go` - new `releaseThemeAssetProjectLeadResolverStub`; two new negative subtests
- `backend/internal/handlers/admin_content_fansub_releases_test.go` - repaired `TestAdminFansubReleases_DirectReleaseThemeUploadHandlerExists` to check both the handler and the new persist file
- `.planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/deferred-items.md` - logs a newly-surfaced, confirmed pre-existing, unrelated `TestSearchBypass*` failure found only once `TEAM4S_PHASE106_TEST_DSN` is actually set for a full `go test ./...` run

## Decisions Made

- Followed the plan's shared-method shape verbatim (success path unwritten, only error branches write a response) to match `FansubHandler.persistFansubMediaAsset`'s established precedent
- Deviated from the plan's `<interfaces>` prose only on the parameter's exact package
  (`models.MediaAssetCreateInput`, not `repository.MediaAssetCreateInput`) — confirmed via
  `services.MediaSaveResult.CreateInput`'s actual declared type; using the plan's literal text
  would not compile

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `TestAdminFansubReleases_DirectReleaseThemeUploadHandlerExists` broken by Task 1's extraction**
- **Found during:** Task 2 (full-suite verification)
- **Issue:** This pre-existing source-grep test asserted the literal string
  `adminreleasethemeassetcreateinput{` inside `admin_content_release_theme_assets.go`'s own
  source. Task 1's D-06 extraction legitimately moved the `AdminReleaseThemeAssetCreateInput{...}`
  construction into the new `admin_content_release_theme_assets_persist.go` file, so the
  literal string stopped appearing in the file this test reads, breaking the test.
- **Fix:** Split the assertion in two: the handler file is checked for
  `uploadreleasethemeassetforrelease` and the call-site's `releaseid,` argument; the new persist
  file is checked for `adminreleasethemeassetcreateinput{` and `releaseid: releaseid`. No new
  source-grep test pattern was introduced (CLAUDE.md's Teststil rule forbids *authoring new*
  tests in this style) — this is a minimal repair of an existing legacy test to the file split
  the plan's own D-06 refactor explicitly required.
- **Files modified:** `backend/internal/handlers/admin_content_fansub_releases_test.go`
- **Commit:** `2ae23679`

**2. [Rule 1 - Bug, type mismatch] Used `models.MediaAssetCreateInput` instead of the plan's `repository.MediaAssetCreateInput`**
- **Found during:** Task 1 (drafting the shared method signature)
- **Issue:** The plan's `<interfaces>` block describes the shared method's parameter type as
  `repository.MediaAssetCreateInput`. No such type exists in the `repository` package — the
  actual type, confirmed via `services.MediaSaveResult.CreateInput`'s declaration and
  `MediaRepository.CreateMediaAsset`'s own signature, is `models.MediaAssetCreateInput`.
- **Fix:** Declared `persistReleaseThemeAsset`'s `createInput` parameter as
  `models.MediaAssetCreateInput`.
- **Files modified:** `backend/internal/handlers/admin_content_release_theme_assets_persist.go`
- **Commit:** `b21df329`

No other deviations — both tasks' acceptance criteria were otherwise met verbatim.

## Issues Encountered

**Enabling `TEAM4S_PHASE106_TEST_DSN` for a real, full-suite `go test ./...` run (rather than
only the plan's own narrowly `-run`-scoped commands) surfaced one additional, confirmed
pre-existing, unrelated failure class** not previously documented in Phase 179's
`deferred-items.md`: `TestSearchBypassTagOnlyFindsGermanTagTranslation`,
`TestSearchBypassTagOnlyTypeAlleFansubStaysEmpty`,
`TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd`, and
`TestSearchNeverReturnsNullItemsForUnsearchedEntity` in
`search_bypass_integration_test.go` fail with `db_schema_mismatch` once their own
`TEAM4S_PHASE106_TEST_DSN`-gated fixture actually runs against real Postgres. This file was
last touched in Phase 160 (`cea49488`), long before Phase 179, and is entirely unrelated to the
theme-asset permission/persistence code this plan touches. Confirmed pre-existing and
unrelated by running `go test ./...` both with and without the DSN set: without it, these four
tests simply `SKIP` (matching every prior Phase 179 plan's baseline); with it, they are the
*only* newly-surfaced failures, and zero `ReleaseThemeAsset`-related tests regress in either
run. Logged in `deferred-items.md` item 8, not fixed (out of scope per Scope Boundary).

A real, ephemeral `team4s_phase106_test_run179` Postgres database was created on the running
`team4sv30-db` container to run both this plan's own targeted verification commands and the
full-suite `go test ./...` run against real Postgres instead of accepting SKIP — all
`TestReleaseThemeAsset_InsertMediaFileCalled`/`Rollback` real-DB assertions (previously only
ever observed as SKIP in prior Phase 179 plans' summaries) ran and passed for real. The
database was dropped again after verification completed.

## User Setup Required

None — no external service configuration required. Both handlers' authorization is now backed
by migration 0182 (applied by Plan 179-01 to the ephemeral test schema only; not yet applied to
the live `team4s_v2` database per project convention — migrations are applied separately via
`cmd/migrate`).

## Next Phase Readiness

Permission-Matrix row 1.6 (Weg 6, Release-Theme-Assets-Upload) is fully closed: both upload
handlers check the correctly-named action, and the persistence duplication is resolved. No
further phase-179 plan depends on this one (`affects: []` per the frontmatter — this was the
sole consumer of Plan 179-01's new action).

---
*Phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht*
*Completed: 2026-10-10*

## Self-Check: PASSED

- FOUND: backend/internal/handlers/admin_content_release_theme_assets_persist.go
- FOUND: backend/internal/handlers/admin_content_release_theme_assets.go
- FOUND: backend/internal/handlers/admin_content_release_theme_assets_test.go
- FOUND: backend/internal/handlers/admin_content_fansub_releases_test.go
- FOUND: .planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/deferred-items.md
- FOUND commit: b21df329 (Task 1)
- FOUND commit: 2ae23679 (Task 2)
