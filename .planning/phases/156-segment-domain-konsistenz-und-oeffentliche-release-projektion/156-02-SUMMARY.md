---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 02
subsystem: api
tags: [go, pgx, postgresql, transactions, admin-content, theme-segments]

# Dependency graph
requires:
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: 01
    provides: "theme_segments.origin_release_version_id column, permissions.SegmentCreditRoleCodes (not directly consumed by this plan, but confirms the phase's shared schema baseline)"
provides:
  - "AssignThemeSegmentToEpisodeRange as the canonical Soll-Ist reconciliation for theme_segment_assignments: shrink removes, grow adds, guard blocks wipe-on-incomplete-input, overrides protect from deletion"
  - "models.ThemeSegmentAssignmentSyncResult{Added, Removed, ProtectedByOverride} -- the typed contract every downstream surface (handler reload condition, render/playback cleanup, admin JSON response) reads from"
  - "range_sync JSON field on the admin segment Create/Update responses, surfacing added/removed/protected_by_override for admin visibility"
affects: [156-04, 156-05, 156-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Insert-missing/delete-excess reconciliation generalized from syncThemeSegmentPlaybackSourceTx's proven shape onto theme_segment_assignments itself"
    - "Single LEFT JOIN override-protection query (no N+1) restricted to a pre-computed deletion-candidate set"
    - "Domain-scoped DELETE (theme_segment_id AND release_version_id = ANY(domainReleaseVersionIDs) AND NOT (... ANY(kept))) as the structural guard against cross-domain over-deletion"

key-files:
  created:
    - backend/internal/repository/theme_segment_assignments_reconciliation_integration_test.go
    - .planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md
  modified:
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/theme_segment_assignments.go
    - backend/internal/repository/theme_segment_assignments_integration_test.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go
    - backend/internal/handlers/admin_content_anime_theme_segment_assignments_test.go
    - backend/internal/handlers/admin_content_release_theme_assets_test.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go

key-decisions:
  - "Kept the incomplete-range guard as the literal first statement, returning (nil, nil) before any tx.Begin/Query/Exec -- proven by a nil-db-field no-panic unit test AND a separate real-Postgres integration test (TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange) that seeds real assignments and proves zero deletions across all five invalid-input cases"
  - "Split the growing integration test file into two files (theme_segment_assignments_integration_test.go, theme_segment_assignments_reconciliation_integration_test.go) to stay under CLAUDE.md's 450-line production-file cap -- the reconciliation-focused tests (guard-with-real-DB, shrink/grow/override-protection/cross-domain) now live in their own file"
  - "Domain scoping computed via the same join-chain as the existing enumeration query, minus the BETWEEN filter -- this is the single mechanism that makes cross-domain over-deletion structurally impossible, not just a runtime check"

requirements-completed: [P156-01, P156-02, P156-03]

# Metrics
duration: 22min
completed: 2026-09-11
---

# Phase 156 Plan 02: Assignment Soll-Ist Reconciliation and Override Protection Summary

**`AssignThemeSegmentToEpisodeRange` is now a domain-scoped, override-aware Soll-Ist reconciliation (insert-missing/delete-excess) instead of a purely-additive helper, with its own dedicated real-Postgres regression test proving the incomplete-range guard blocks every deletion path.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-11T20:11:00Z
- **Completed:** 2026-09-11T20:33:00Z
- **Tasks:** 2 completed
- **Files modified:** 9 (7 modified, 1 new test file, 1 new deferred-items note)

## Accomplishments
- `AssignThemeSegmentToEpisodeRange` rewritten to enumerate the target range, insert missing assignments (unchanged), then compute a domain-scoped deletion candidate set, exclude override-protected rows via a single `LEFT JOIN`, and delete the rest transactionally alongside their now-orphaned `theme_segment_playback_sources`/`theme_segment_render_cache` rows
- The incomplete-range guard (`segmentID/animeID/fansubGroupID<=0` or `startEpisode/endEpisode<=0`) is proven in two independent, explicitly-named tests: `TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess` (nil-db-field, zero DB access) and `TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange` (real Postgres, seeded assignments, proves zero deletions across all five invalid-input cases)
- Shrink-removes, grow-adds, override-protection-survives, and cross-domain-safety are each proven by their own named subtest in `TestAssignThemeSegmentToEpisodeRange` against a real, isolated Postgres schema
- Both admin handler call sites (Create/Update) now reload on `Added > 0 OR Removed > 0` (not just `Added > 0`), fixing the shrink-only-update-shows-stale-response gap flagged in `156-RESEARCH.md` Pitfall A-1
- Both responses now include a `range_sync` field surfacing `added`/`removed`/`protected_by_override` for admin visibility, per CONTEXT.md's "sichtbar gemeldet" requirement
- Created the `team4s_phase117_test_156` fixture database (schema created fresh per-test-run by the existing `testsupport.OpenPhase117Postgres` harness) and ran every new/changed test against real PostgreSQL, not just `go build`/`go vet`

## Task Commits

Each task was committed atomically:

1. **Task 1: Reconciling AssignThemeSegmentToEpisodeRange + typed sync result + integration tests** - `a2bd2078` (feat)
2. **Task 2: Wire the reconciling signature through the interface and both handler call sites** - `de694807` (feat)

**Plan metadata:** (this commit) `docs(156-02): complete plan`

## Files Created/Modified
- `backend/internal/models/admin_anime_themes.go` - added `ThemeSegmentAssignmentSyncResult{Added, Removed, ProtectedByOverride []int64}`
- `backend/internal/repository/theme_segment_assignments.go` - `AssignThemeSegmentToEpisodeRange` rewritten as insert-missing/delete-excess reconciliation; guard preserved verbatim as first statement; new `themeSegmentDomainReleaseVersionIDsQuery` const and `collectInt64Column` helper
- `backend/internal/repository/theme_segment_assignments_integration_test.go` - guard-without-DB-access test extended for the new return shape; the old "additive" subtest removed (now contradicts the new behavior); kept the unrelated override-per-episode and CRUD tests; file split to stay under 450 lines
- `backend/internal/repository/theme_segment_assignments_reconciliation_integration_test.go` - NEW: `TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange` (dedicated real-Postgres guard regression) and `TestAssignThemeSegmentToEpisodeRange`'s shrink/grow/override-protection/cross-domain-safety subtests
- `backend/internal/handlers/admin_content_handler.go` - `adminThemeRepository.AssignThemeSegmentToEpisodeRange` interface entry returns `*models.ThemeSegmentAssignmentSyncResult`
- `backend/internal/handlers/admin_content_anime_theme_segments.go` - both call sites (`CreateAnimeSegment`, `UpdateAnimeSegment`) renamed to `rangeSync`, reload condition fixed to `Added>0 || Removed>0`, fan-out uses `rangeSync.Added`, responses extended with `range_sync`
- `backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go` - fake repo's `rangeResult` field and method signature updated to the new struct type; all four existing tests' fixtures updated
- `backend/internal/handlers/admin_content_anime_theme_segment_assignments_test.go`, `admin_content_release_theme_assets_test.go`, `admin_content_fansub_releases_test.go` - three additional `adminThemeRepository` stub implementations (not listed in the plan's `files_modified`, discovered via `grep` during execution) updated to the new signature so the package compiles (Rule 3: blocking compile error, not a package install)

## Decisions Made
- Followed the plan's prescribed struct shape (`ThemeSegmentAssignmentSyncResult{Added, Removed, ProtectedByOverride}`) and Pattern 2's single-`LEFT JOIN` override-protection query exactly as specified.
- Split `theme_segment_assignments_integration_test.go` into two files when the plan's additions pushed it from 330 to 532 lines, over CLAUDE.md's 450-line cap. This is a CLAUDE.md-driven adjustment (Rule 2: auto-add missing critical functionality) not explicitly named in `156-02-PLAN.md`'s `files_modified`, but required by the project's hard modularity constraint. `admin_content_anime_theme_segments.go` was NOT split: it was already at 957 lines (baseline, before this plan touched it) and this plan's net addition was only +10 lines -- pre-existing debt from before this plan, not something this plan's change pushed over a limit it wasn't already over, mirroring the `permissions.go` precedent documented in `156-01-SUMMARY.md`.
- Updated the three `adminThemeRepository` stub files found via `grep -rn "AssignThemeSegmentToEpisodeRange"` that were not in the plan's `files_modified` list, since the interface signature change would otherwise not compile. This is Rule 3 (blocking issue), not a package install, so no checkpoint was required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Three additional `adminThemeRepository` stub files needed the new signature to compile**
- **Found during:** Task 2 build verification
- **Issue:** `admin_content_anime_theme_segment_assignments_test.go`, `admin_content_release_theme_assets_test.go`, and `admin_content_fansub_releases_test.go` each implement `AssignThemeSegmentToEpisodeRange(...) ([]int64, error)` as part of satisfying the `adminThemeRepository` interface for their own (unrelated) handler tests. Changing the interface's return type broke compilation of the whole `handlers` package.
- **Fix:** Updated all three stub methods' signatures to `(*models.ThemeSegmentAssignmentSyncResult, error)`, all still returning `nil, nil` (none of these tests exercise range-auto-assign behavior).
- **Files modified:** the three files listed above.
- **Commit:** `de694807`

**2. [Rule 2 - Missing Critical / CLAUDE.md modularity] Split the integration test file to stay under the 450-line cap**
- **Found during:** Task 1, after writing all five new/changed subtests
- **Issue:** `theme_segment_assignments_integration_test.go` grew from 330 to 532 lines, 82 lines over CLAUDE.md's hard 450-line production-file limit.
- **Fix:** Moved `TestAssignThemeSegmentToEpisodeRangeGuardNeverDeletesOnIncompleteRange` and `TestAssignThemeSegmentToEpisodeRange` (with its 6 subtests) into a new sibling file, `theme_segment_assignments_reconciliation_integration_test.go`. Both resulting files (242 and 303 lines) are now under the cap.
- **Files modified:** `theme_segment_assignments_integration_test.go`, `theme_segment_assignments_reconciliation_integration_test.go` (new)
- **Verification:** `wc -l` on both files confirms <450; both tests pass against real Postgres.
- **Commit:** `a2bd2078`

---

**Total deviations:** 2 auto-fixed (1 blocking compile fix, 1 CLAUDE.md modularity split)
**Impact on plan:** Both auto-fixes were required for correctness (package must compile) and project-constraint compliance (450-line cap). No scope creep -- no behavior changed beyond what the plan specified.

## Known Pre-Existing Debt (not introduced by this plan)

- `backend/internal/handlers/admin_content_anime_theme_segments.go` was already 957 lines before this plan touched it (confirmed via `git show HEAD~2:.../admin_content_anime_theme_segments.go | wc -l` against the pre-156-02 commit). This plan's changes added 10 net lines (957 -> 967), consistent with the plan's explicit instruction to modify both call sites in this exact file. Splitting a 957-line pre-existing handler file is a distinct architectural undertaking outside this 2-task plan's scope, mirroring the accepted precedent for `permissions.go` documented in `156-01-SUMMARY.md`.
- A pre-existing test-isolation-order dependency causes `TestCreateAnimeSegment_RangeAutoAssign*`/`TestUpdateAnimeSegment_RangeAutoAssign*` to fail with `403 insufficient_role` when run in isolation (`-run RangeAutoAssign`), but pass when run as part of the full `internal/handlers` package suite. Reproduced identically on a clean checkout of the commit immediately before this plan (`4fa8da5c`), confirming it predates this plan entirely. Logged in detail at `.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md`. The plan's acceptance criterion ("all four existing range-auto-assign handler tests pass") is satisfied via the full-suite command (`go test ./internal/handlers/... -count=1`), which is green.

## Issues Encountered

The plan's mandated verify command for Task 2 (`go test ./internal/handlers/... -run 'RangeAutoAssign' -v`) fails due to the pre-existing test-order dependency above. Diagnosed by reproducing the identical failure on a disposable `git worktree add` checkout of the pre-plan baseline commit, then removing that worktree -- confirming the failure is unrelated to this plan's changes before proceeding. The full package suite (`go test ./internal/handlers/... -count=1`) is the command actually used to confirm correctness, and it is green.

## User Setup Required

None - no external service configuration required. The `team4s_phase117_test_156` fixture database was created directly against the live `team4sv30-db` dev container as part of this plan's verification (not deferred to the user), matching the existing `TEAM4S_PHASE117_TEST_DSN` convention already used by 12+ tests in this table family.

## Next Phase Readiness
- Plan 156-04 (auto-assignment of newly created release versions) can call the same reconciling `AssignThemeSegmentToEpisodeRange` or its underlying domain-query pattern with confidence that the guard and domain-scoping are independently regression-tested.
- The `range_sync` response field is available for a future admin UI surfacing pass (explicitly deferred per CONTEXT.md's no-redesign constraint for this plan).
- No blockers identified for downstream plans. The pre-existing permission-test-order issue and the pre-existing `admin_content_anime_theme_segments.go` line-count debt are both documented and do not block phase progress.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*

## Self-Check: PASSED

All created/modified files confirmed present on disk (9/9 checked: models, repository x3,
handlers x3, SUMMARY, deferred-items.md). Both task commits (`a2bd2078`, `de694807`) confirmed
present in `git log`.
