---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 13
subsystem: backend
tags: [go, postgresql, migrations, media, contributions]

# Dependency graph
requires:
  - phase: 176-05
    provides: "D-18/D-19/D-20/D-21 display-variant filename rules and buildDisplayVariant"
  - phase: 176-06
    provides: "anime_contributions schema familiarity from the same collection phase"
provides:
  - "Single canonical displayVariantFileName (exported as DisplayVariantFileName) used by both the upload and replace media paths"
  - "anime_contributions.review_status_id fully removed from the live schema via reversible migration 0180"
affects: [media-upload, admin-content, contributions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exporting a services-package helper (DisplayVariantFileName) instead of duplicating narrower logic in handlers"

key-files:
  created:
    - database/migrations/0180_drop_anime_contributions_review_status_id.up.sql
    - database/migrations/0180_drop_anime_contributions_review_status_id.down.sql
  modified:
    - backend/internal/handlers/admin_content_release_version_media_replace.go
    - backend/internal/services/media_service_display_variant.go
    - backend/internal/services/media_service_display_filename_test.go
    - backend/internal/handlers/contributions_me_handler.go
  deleted:
    - backend/internal/handlers/admin_content_release_version_media_replace_display.go

key-decisions:
  - "Exported displayVariantFileName as DisplayVariantFileName in the services package rather than adding a new wrapper, since it is the single canonical rule and the replace handler already imports services"
  - "Migration 0180 drops FK, then index, then column, in that idempotent IF EXISTS order; down.sql recreates all three exactly as 0097 originally did"

patterns-established: []

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-10-08
---

# Phase 176 Plan 13: D-10/D-20 Backend Cleanup Summary

**Merged the duplicate display-variant filename helper into the canonical `DisplayVariantFileName`, and dropped the dead `anime_contributions.review_status_id` column (with FK and index) via a reversible migration applied to the live dev DB.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-08T09:30:00Z (approx)
- **Completed:** 2026-10-08
- **Tasks:** 2
- **Files modified:** 7 (4 modified, 2 created, 1 deleted)

## Accomplishments
- D-10: `rvmReplaceDisplayPath` removed entirely; its one caller in
  `admin_content_release_version_media_replace.go` now calls the exported
  `services.DisplayVariantFileName(originalPath, displayExt)`, producing the identical
  `display.<ext>` output for the replace flow's `original.<ext>` asset (verified: stem
  `"original"` -> `"display.<ext>"` branch).
- D-20: `anime_contributions.review_status_id`, its FK `fk_anime_contributions_review_status`,
  and its index `idx_anime_contributions_review_status_id` are gone from the live
  `team4s_v2` database (confirmed via `\d anime_contributions`). The two dead copy-forward
  writes in `contributions_me_handler.go`'s revision-clone `INSERT ... SELECT` were removed
  from both the column list and the SELECT list.

## Task Commits

Each task was committed atomically:

1. **Task 1: Merge rvmReplaceDisplayPath into displayVariantFileName (D-10)** - `4b41463e` (refactor)
2. **Task 2: Drop anime_contributions.review_status_id (D-20)** - `b9fe0773` (chore)

**Plan metadata:** (this commit, created after SUMMARY.md)

## Files Created/Modified
- `backend/internal/handlers/admin_content_release_version_media_replace_display.go` - deleted (sole function `rvmReplaceDisplayPath` removed)
- `backend/internal/handlers/admin_content_release_version_media_replace.go` - call site redirected to `services.DisplayVariantFileName`
- `backend/internal/services/media_service_display_variant.go` - `displayVariantFileName` exported as `DisplayVariantFileName`, all 5 internal call sites updated
- `backend/internal/services/media_service_display_filename_test.go` - updated to call the exported name
- `database/migrations/0180_drop_anime_contributions_review_status_id.up.sql` - new, drops FK/index/column with `IF EXISTS`
- `database/migrations/0180_drop_anime_contributions_review_status_id.down.sql` - new, recreates column/FK/index exactly as migration 0097
- `backend/internal/handlers/contributions_me_handler.go` - `review_status_id` removed from the revision-clone INSERT column list and SELECT list

## Decisions Made
- Exported `displayVariantFileName` as `DisplayVariantFileName` directly (no new wrapper) since the `services` package already has a clean, well-tested "original" branch that exactly matches the old `rvmReplaceDisplayPath` behavior, and `handlers` already imports `services`.
- Migration ordering (FK -> index -> column on up; column -> FK -> index on down) mirrors standard safe-drop practice and exactly reverses migration 0097's original creation order.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched the plan's interfaces and read_first guidance; no architectural changes, no missing-critical-functionality gaps, and no blocking issues required a fix beyond the planned scope.

## Issues Encountered

The plan's acceptance-criteria test regexes (`-run "ReleaseVersionMedia.*Replace"` and `-run "ContributionsMe"`) matched narrower or differently-named test sets than literally written (actual test names are `TestReplaceReleaseVersionMediaFile*` and `TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper` /
`TestRespondMemberProfileRequiredUsesStandardizedEnvelope` / `TestRejectContributionRequiresReason`). Ran the broader, correctly-matching test names instead; all non-DB-integration tests pass, and the DB-integration subtests skip cleanly without `TEAM4S_PHASE107_TEST_DSN` (expected repo-wide behavior, documented pattern from Phase 107). Additionally manually verified the revision-clone SQL column alignment via a live `SELECT` against `team4s_v2` inside a rolled-back transaction, since no unit test exercises that exact query without the disposable-DB harness.

Pre-existing, unrelated test failures were observed in the broader `go test ./internal/handlers/... ./internal/services/...` run (missing Jellyfin fixture files, a known `release_version_media.reorder` permission-cache gap already logged under 176-12). Logged to `deferred-items.md` under a new `## 176-13` section per Scope Boundary; not fixed, as they are untouched by this plan's files.

## User Setup Required

None - no external service configuration required. Migration 0180 was already applied to the live dev database (`team4s_v2`) as part of Task 2 execution.

## Next Phase Readiness
- Both D-10 and D-20 from Paket E are closed. No blockers for subsequent 176 plans.
- The live dev schema now matches the reversible migration state (0180 applied); `down.sql` is available if a rollback is ever needed.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-08*

## Self-Check: PASSED

All created/modified files confirmed on disk, the deleted file confirmed gone, and both
task commits (`4b41463e`, `b9fe0773`) confirmed present in `git log`.
