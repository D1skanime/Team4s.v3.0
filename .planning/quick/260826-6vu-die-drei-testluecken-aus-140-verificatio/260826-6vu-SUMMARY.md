---
phase: 260826-6vu-die-drei-testluecken-aus-140-verificatio
plan: 01
subsystem: testing
tags: [go, testify, vitest, testing-library, review-delegation, admin]

# Dependency graph
requires:
  - phase: 140-review-delegation-management
    provides: AdminReviewDelegationHandler, ReviewDelegationRepository.LoadDelegationSnapshot, CapabilityDetailRow Option (d) grant/deny split
provides:
  - HTTP-level stub test coverage for AdminReviewDelegationHandler.GetReviewDelegations/MutateReviewDelegation
  - Fake-DBTX and real-Postgres test coverage for ReviewDelegationRepository.LoadDelegationSnapshot
  - Frontend regression test for CapabilityDetailRow's Option (d) asymmetric grant/deny split
affects: [140-review-delegation-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Go handler stub tests mirror admin_effective_rights_handler_test.go's test-double + gin-test-context convention exactly (reviewDelegationTestContext, targetMembershipKey reuse, captureAuditLogRepo reuse)"
    - "Non-locking repository read models get their own fake-DBTX test asserting NotContains 'FOR UPDATE' as the explicit contrast with the locking sibling method"
    - "Frontend row components that unconditionally mount a history-panel child require the @/lib/api mock + waitFor(mockFn called) settle pattern before assertions, even when the test isn't about history"

key-files:
  created:
    - frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx
  modified:
    - backend/internal/handlers/admin_review_delegation_handler_test.go
    - backend/internal/repository/review_delegation_repository_test.go

key-decisions:
  - "No production code was modified; all three test-authoring tasks closed 140-VERIFICATION.md's gaps without touching admin_review_delegation_handler.go, review_delegation_repository.go, CapabilityDetailRow.tsx, or userGroupRightsHelpers.ts"
  - "The repo has no jest-dom matcher setup (no toBeInTheDocument) -- new frontend assertions follow the existing sibling-file convention of .not.toBeNull()/.toBeNull() instead"

patterns-established: []

requirements-completed: [RDEL-01, RDEL-03, RDEL-04]

# Metrics
duration: ~20min
completed: 2026-08-26
---

# Quick Task 260826-6vu: Close the three Phase 140 test-coverage gaps Summary

**Added 10 backend handler tests, 4 backend repository tests, and 6 frontend regression tests closing all three gaps 140-VERIFICATION.md found, with zero production code touched.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-26 (session start)
- **Completed:** 2026-08-26T05:10:24Z
- **Tasks:** 3/3 completed
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- Closed 140-VERIFICATION.md Gap 1: `AdminReviewDelegationHandler.GetReviewDelegations`/`MutateReviewDelegation` now have full HTTP-level stub test coverage for the auth gate, 404 mapping, action_code validation (including the "reject before touching state" ordering guarantee), grant/revoke dispatch, and 403/422 error mapping.
- Closed 140-VERIFICATION.md Gap 2: `ReviewDelegationRepository.LoadDelegationSnapshot` now has a fake-DBTX unit test (8-column scan order, non-locking SQL contrast with `LockMembership`), a validation test, a not-found test, and a real-Postgres integration test (skips cleanly without `TEAM4S_PHASE107_TEST_DSN`).
- Closed 140-VERIFICATION.md Gap 3: `CapabilityDetailRow.test.tsx` now exists and regression-protects the Option (d) asymmetric grant/deny split for the 3 review-delegation actions, plus a non-review-action control case and a deny-path-untouched case.
- Both stack-level regression suites confirmed at 0 new failures: `internal/handlers`+`internal/repository` filtered run is fully green (no baseline failures triggered by this filter), and the full `admin/users/tabs` frontend suite is 13/13 files, 67/67 tests green.

## Task Commits

Each task was committed atomically:

1. **Task 1: HTTP-level stub tests for AdminReviewDelegationHandler** - `69131965` (test)
2. **Task 2: Fake-DBTX, validation, and real-Postgres tests for LoadDelegationSnapshot** - `e1695f86` (test)
3. **Task 3: CapabilityDetailRow regression test for Option (d) grant-removal** - `5545e05d` (test)

**Plan metadata:** committed separately by the orchestrator (this SUMMARY.md is not yet committed).

## Files Created/Modified

- `backend/internal/handlers/admin_review_delegation_handler_test.go` - Added 4 test doubles (`reviewDelegationPermissionStub`, `reviewDelegationMutationStub`, `reviewDelegationTargetRepoStub`, `reviewDelegationReadRepoStub`), a `reviewDelegationTestContext` helper, and 10 tests covering `GetReviewDelegations`/`MutateReviewDelegation`
- `backend/internal/repository/review_delegation_repository_test.go` - Added 4 tests for `LoadDelegationSnapshot` (fake-DBTX policy snapshot, validation, not-found, real-Postgres)
- `frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx` - New file; 6 tests (`it.each` over the 3 review actions plus 3 standalone cases) covering the Option (d) grant/deny split

## Decisions Made

- No production file was modified in any of the three tasks — verified with `git diff --stat` against `admin_review_delegation_handler.go`, `review_delegation_repository.go`, `CapabilityDetailRow.tsx`, and `userGroupRightsHelpers.ts` (empty diff, confirming byte-identical state).
- Frontend assertions use `.not.toBeNull()`/`.toBeNull()` rather than `toBeInTheDocument()` — this repo's `vitest.config.ts` has no jest-dom setup file, and no existing sibling test in `admin/users/tabs/` uses `toBeInTheDocument()`. Discovered this during the first Task 3 test run (`Invalid Chai property: toBeInTheDocument`), fixed to match the established convention before proceeding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed my own test-authoring mistake: `toBeInTheDocument()` not available**
- **Found during:** Task 3, first `vitest run` of the new test file
- **Issue:** All 6 new tests failed with `Invalid Chai property: toBeInTheDocument` — the assertion helper drafted from generic React Testing Library habit, not this repo's actual matcher setup (no `@testing-library/jest-dom` import/setup exists anywhere in this codebase).
- **Fix:** Replaced all `.toBeInTheDocument()` calls with `.not.toBeNull()` (present) / `.toBeNull()` (absent), matching the exact convention already used in every sibling test file in `admin/users/tabs/` (e.g. `UserGroupRightsTab.test.tsx`, `CapabilityHistoryPanel.test.tsx`).
- **Files modified:** `frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx` (pre-first-commit, not a separate commit)
- **Verification:** Re-ran the test file; all 6 tests passed.

**2. [Rule 1 - Bug] Fixed my own test-authoring mistake: missing `#review-delegation-section` DOM target for the scroll-into-view interaction test**
- **Found during:** Task 3, same first `vitest run`
- **Issue:** The "scrolls to the review-delegation section when the jump link is clicked" test failed with "expected spy to be called at least once". Root cause: the component's onClick handler is `document.getElementById('review-delegation-section')?.scrollIntoView(...)` — optional chaining silently no-ops when that element doesn't exist elsewhere on the page, which is exactly the case in an isolated component-only render.
- **Fix:** Added a throwaway `<div id="review-delegation-section">` to `document.body` before rendering in that one test, removed after the assertion.
- **Files modified:** `frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx` (pre-first-commit, not a separate commit)
- **Verification:** Re-ran the test file; the interaction test passed and `scrollIntoView` was confirmed called.

---

**Total deviations:** 2 auto-fixed (both Rule 1, both self-authored test mistakes caught and fixed before the Task 3 commit — no production code involved).
**Impact on plan:** Zero scope creep; both fixes were internal to getting the new test file's own assertions correct against this repo's actual test-tooling conventions.

## Issues Encountered

None beyond the two self-fixed authoring mistakes documented above. No genuine production defects were found — all three production files (`admin_review_delegation_handler.go`, `review_delegation_repository.go`, `CapabilityDetailRow.tsx`) behaved exactly as 140-VERIFICATION.md's direct code-inspection claimed.

## Verification Results

- `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./internal/handlers ./internal/repository -run 'ReviewDelegation|Delegation' -count=1"` → `ok team4s.v3/backend/internal/handlers 0.026s`, `ok team4s.v3/backend/internal/repository 0.009s` (0 failures; real-Postgres test skips cleanly as expected without `TEAM4S_PHASE107_TEST_DSN`).
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs --reporter=basic"` → 13 test files passed, 67 tests passed, 0 failed.
- `go vet ./internal/handlers` and `go vet ./internal/repository` both clean.
- `npx eslint` on the new frontend test file: clean.

## Known Stubs

None.

## Threat Flags

None — this plan only added tests; no new network endpoints, auth paths, file access patterns, or schema changes were introduced.

## Next Phase Readiness

- Phase 140 (review delegation management) can now be honestly re-marked `passed` — all three gaps 140-VERIFICATION.md identified are closed with real, passing test coverage, and both regression suites remain at their documented Phase-137/139 baseline.

---
*Phase: 260826-6vu-die-drei-testluecken-aus-140-verificatio*
*Completed: 2026-08-26*

## Self-Check: PASSED

All 4 files confirmed present on disk; all 3 task commits confirmed present in `git log --oneline --all`.
