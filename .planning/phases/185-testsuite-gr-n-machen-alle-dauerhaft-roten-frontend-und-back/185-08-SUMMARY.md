---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 08
subsystem: testing
tags: [go, permissions, cache-loader, postgres-fixture, test-only]

# Dependency graph
requires:
  - phase: 169-01
    provides: "permissions.ActionReleaseVersionMediaReorder action constant (commit 98c5f1dfe)"
  - phase: 138-05
    provides: "testsupport.OpenPhase137Postgres's shared member_claims table (real migration-0081 shape)"
provides:
  - "membership_baseline_registry_test.go, release_review_query_repository_test.go, and effective_rights_service_test.go's local permissions.CacheLoader stubs now cover the full permissions.Action catalog (no t.Fatalf on LoadCache's completeness gate)"
  - "effective_rights_service_test.go's Phase-137 fixture no longer creates a duplicate member_claims table"
affects: [permissions, release_review, effective_rights, membership_baseline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Local test CacheLoader stub 'unused role' / 'filler role' lists must enumerate every permissions.Action not otherwise granted, in permissions.go's canonical declaration order, or LoadCache's whole-catalog completeness gate fails closed on the very first test that loads the cache."
    - "testsupport.OpenPhase1XXPostgres fixtures are the single source of truth for any shared production-shape table (e.g. member_claims); per-file ad-hoc CREATE TABLE for the same table collides with 'relation already exists' once more than one test in the file shares the fixture."

key-files:
  created: []
  modified:
    - backend/internal/repository/membership_baseline_registry_test.go
    - backend/internal/repository/release_review_query_repository_test.go
    - backend/internal/services/effective_rights_service_test.go
    - .planning/phases/185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back/deferred-items.md

key-decisions:
  - "Fixing the plan-specified ActionReleaseVersionMediaReorder gap exposed two further gaps in the same stub lists (ActionReleaseVersionMediaHighlight in all three files, ActionReleaseVersionNotesViewAll in membership_baseline_registry_test.go and release_review_query_repository_test.go) — fixed them too under deviation Rule 1, since they are the identical bug class blocking the exact tests this plan's done criteria require to pass."
  - "Logged unrelated, pre-existing repository-package test failures (Keycloak auth, missing test DSNs, schema drift, a handler nil-pointer panic) to a new deferred-items.md instead of fixing them — out of scope for this plan's three files."

patterns-established: []

requirements-completed: [D-02]

# Metrics
duration: ~20min
completed: 2026-10-16
---

# Phase 185 Plan 08: Fix local CacheLoader catalog-completeness gaps and duplicate member_claims table Summary

**Closed the recurring `permissions.Service.LoadCache` whole-catalog completeness-gate gap (3 missing `Action` constants across 3 local test `CacheLoader` stubs) plus a duplicate `member_claims` table collision, bringing 10 previously `t.Fatalf`-cascading tests to green.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-16
- **Tasks:** 2
- **Files modified:** 4 (3 production-adjacent test files + 1 new deferred-items.md)

## Accomplishments
- `membership_baseline_registry_test.go`, `release_review_query_repository_test.go`, and `effective_rights_service_test.go`'s local `permissions.CacheLoader` stubs now enumerate every `permissions.Action` in the canonical catalog, so `LoadCache`'s D-10 completeness check no longer aborts the first test in each file.
- `effective_rights_service_test.go`'s `openPhase137EffectiveRightsPostgres` no longer creates its own `member_claims` table, eliminating the `relation "member_claims" already exists` error that previously cascaded to every test after the first via the shared `sync.Once`-guarded cache load.
- All 10 targeted tests pass: `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights`, `TestPhase141RevokedDelegationImmediateEffect`, and the 8 `TestPhase137EffectiveRightsOverrideMutation*`/`TestPhase137EffectiveRightsOverrideRetainedDormant*` tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ActionReleaseVersionMediaReorder to all three local CacheLoader stub lists** - `469a70907` (fix) — also includes the two additional same-class gaps discovered while verifying (see Deviations).
2. **Task 2: Remove the local duplicate member_claims CREATE TABLE from openPhase137EffectiveRightsPostgres** - `e7e81b096` (fix)

**Plan metadata:** (this commit, docs: complete plan — to follow)

## Files Created/Modified
- `backend/internal/repository/membership_baseline_registry_test.go` - Added `ActionReleaseVersionMediaReorder` and `ActionReleaseVersionMediaHighlight` to `membershipBaselineFillGapCacheLoader`'s filler-role action list; added `ActionReleaseVersionNotesViewAll`.
- `backend/internal/repository/release_review_query_repository_test.go` - Added the same three actions to `releaseReviewDelegationCacheLoader`'s `_release_review_test_unused_role` list, in canonical `permissions.go` order.
- `backend/internal/services/effective_rights_service_test.go` - Added `ActionReleaseVersionMediaReorder` and `ActionReleaseVersionMediaHighlight` to `effectiveRightsCacheLoaderStub`'s `_effective_rights_test_unused_role` list (file already had `NotesViewAll`); removed the local duplicate `member_claims` `CREATE TABLE` from `openPhase137EffectiveRightsPostgres` and updated its doc comment to document the fix, following the existing `fansub_group_member_roles` precedent.
- `.planning/phases/185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back/deferred-items.md` - New file logging out-of-scope, pre-existing repository-package test failures discovered during full-package verification (not fixed — unrelated root causes).

## Decisions Made
- Treated the two additional missing-action gaps (`ActionReleaseVersionMediaHighlight`, `ActionReleaseVersionNotesViewAll`) as Rule 1 auto-fixes rather than architectural questions: they are the exact same bug mechanism (local stub list missing a catalog action) in the exact files/functions this plan was already editing, and were directly blocking the specific tests this plan's done criteria require to pass.
- Did not attempt to fix the ~50 unrelated pre-existing repository-package test failures surfaced by the full `go test ./internal/repository/...` run (Keycloak auth failures, missing test DSNs, a genuine `au.display_name` schema-drift bug, and a nil-pointer panic in an unrelated handler) — out of this plan's scope; logged to `deferred-items.md` for a future dedicated plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing `ActionReleaseVersionMediaHighlight` to all three local CacheLoader stub lists**
- **Found during:** Task 1 verification — after adding `ActionReleaseVersionMediaReorder`, the exact same `LoadCache` completeness-gate error reappeared for `ActionReleaseVersionMediaHighlight` (the sibling action from the same commit, `permissions.go` line 53/259) in all three files.
- **Issue:** `permissions.ActionReleaseVersionMediaHighlight` was also never added to any of the three local stub lists — same root cause as the plan's named `Reorder` gap.
- **Fix:** Added `permissions.ActionReleaseVersionMediaHighlight,` immediately after `ActionReleaseVersionMediaReorder` in all three files, matching canonical ordering.
- **Files modified:** `backend/internal/repository/membership_baseline_registry_test.go`, `backend/internal/repository/release_review_query_repository_test.go`, `backend/internal/services/effective_rights_service_test.go`
- **Verification:** `go build ./... && go vet ./...` clean; targeted `go test` runs below all pass.
- **Committed in:** `469a70907` (Task 1 commit)

**2. [Rule 1 - Bug] Added missing `ActionReleaseVersionNotesViewAll` to two of the three local CacheLoader stub lists**
- **Found during:** Task 1 verification — after fixing both media actions, `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights` and `TestPhase141RevokedDelegationImmediateEffect` both still failed on the same completeness gate, this time for `permissions.ActionReleaseVersionNotesViewAll`, which `effective_rights_service_test.go` already listed but `membership_baseline_registry_test.go` and `release_review_query_repository_test.go` did not.
- **Issue:** Same stub-list-gap bug class, pre-existing and unrelated to the `Reorder`/`Highlight` commit, but still blocking the exact two tests this plan's Task 1 done criteria require to pass.
- **Fix:** Added `permissions.ActionReleaseVersionNotesViewAll,` to both files' lists, immediately after `ActionReleaseVersionMediaHighlight`/`ActionReleaseVersionNotesWrite` respectively.
- **Files modified:** `backend/internal/repository/membership_baseline_registry_test.go`, `backend/internal/repository/release_review_query_repository_test.go`
- **Verification:** `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights` and `TestPhase141RevokedDelegationImmediateEffect` both pass (run against `team4s_phase145_test_146` and `team4s_phase107_test_regression`/`team4s_phase137_test_1` respectively).
- **Committed in:** `469a70907` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - same bug class as the plan's named fix, directly blocking required done-criteria tests)
**Impact on plan:** No scope creep — both fixes are the identical mechanism in the identical files/functions the plan already targets, required for the plan's own stated tests to go green. No production permission-resolution code was touched; only test-local `CacheLoader` stub data.

## Issues Encountered
- Running the full `backend/internal/repository` package test suite (beyond the plan's named tests) surfaced ~50 unrelated pre-existing failures spanning member-archive, member-claims, member-point-totals, contribution-badges, dashboard, public-profile, public-badges, role-volume, Phase-128, Phase-134 (Keycloak-dependent), and release-version-media tests, plus one handler nil-pointer panic. None of these touch the three files this plan modifies, and `go test ./internal/services/...` (the package Task 2's fix lives in) is fully green. Logged to `deferred-items.md` for future triage rather than fixed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `permissions.CacheLoader` completeness is now consistent across all three files touched by this plan; no further Reorder/Highlight/NotesViewAll gaps remain in them.
- A dedicated future plan should triage the ~50 pre-existing repository-package failures logged in `deferred-items.md` (Keycloak test-user setup, missing test DSNs, the `au.display_name` schema-drift bug, and the `UploadReleaseVersionMedia` nil-pointer panic) — none block this plan's D-02 requirement.

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*
