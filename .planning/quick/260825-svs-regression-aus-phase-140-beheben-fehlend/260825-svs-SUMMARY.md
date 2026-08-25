---
phase: 260825-svs-regression-aus-phase-140-beheben-fehlend
plan: 01
subsystem: testing
tags: [vitest, mock, admin, react-testing-library]

# Dependency graph
requires:
  - phase: 140
    provides: ReviewDelegationSection component wired into GroupSection (calls getReviewDelegations/mutateReviewDelegation from @/lib/api)
provides:
  - Complete @/lib/api mock in UserGroupRightsTab.test.tsx covering getReviewDelegations and mutateReviewDelegation
affects: [admin/users test suite]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx

key-decisions:
  - "Default mockGetReviewDelegations to resolve [] in beforeEach, mirroring mockListOverrideHistory's existing empty-default pattern, since ReviewDelegationSection renders a safe disabled/no-row state on empty data that doesn't affect any existing assertion."
  - "Left mockMutateReviewDelegation without a default resolved value since no existing test clicks a ReviewDelegationSection switch, matching the precedent set by other unused-by-default mocks like mockMutateCapabilityOverride."

patterns-established: []

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-08-25
---

# Quick Task 260825-svs: Fix Phase 140 Regression in UserGroupRightsTab Tests Summary

**Completed the `@/lib/api` mock factory in `UserGroupRightsTab.test.tsx` with `getReviewDelegations`/`mutateReviewDelegation`, restoring a green test suite after Phase 140 wired `ReviewDelegationSection` into every `GroupSection`.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-25T20:42:00Z
- **Completed:** 2026-08-25T20:50:34Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `UserGroupRightsTab.test.tsx`'s `vi.mock('@/lib/api', ...)` factory now declares all nine exports the rendered component tree needs, including the two Phase-140-introduced ones.
- All six pre-existing `UserGroupRightsTab` describe blocks pass with byte-identical assertions.
- Confirmed via grep that no sibling test file in `frontend/src/app/admin/users/tabs/` needed the same fix (`ReviewDelegationSection.test.tsx` already has its own complete `vi.hoisted` mock; the other seven files mock `@/lib/api` but never render `GroupSection`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Complete the @/lib/api mock in UserGroupRightsTab.test.tsx** - `6cddcb75` (fix)

**Plan metadata:** (docs commit handled by orchestrator, not included here)

## Files Created/Modified
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` - Added `mockGetReviewDelegations`/`mockMutateReviewDelegation` declarations, wired both into the `@/lib/api` mock factory, and added a `beforeEach` default resolving `getReviewDelegations` to `[]`.

## Decisions Made
- Defaulted `getReviewDelegations` to resolve `[]` (empty array) in `beforeEach`, mirroring the existing `mockListOverrideHistory` empty-default pattern — `ReviewDelegationSection` renders its three fixed `ACTIONS` rows in a disabled/no-row state on empty data, adding no text node that any existing test asserts against.
- Left `mutateReviewDelegation` without a default resolved value, matching the precedent of other unused-by-default mocks (e.g. `mockMutateCapabilityOverride`), since no existing test clicks a `ReviewDelegationSection` switch.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Full `frontend/src/app/admin/users/tabs/` vitest suite is green (12 test files, 61 tests, 0 failures). No production code was touched (`ReviewDelegationSection.tsx`, `GroupSection.tsx`, `UserGroupRightsTab.tsx` unmodified — confirmed via `git status --short`/`git diff --stat` showing only the test file changed). Phase 140's remaining work is unaffected by this fix.

---
*Phase: 260825-svs-regression-aus-phase-140-beheben-fehlend*
*Completed: 2026-08-25*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
- FOUND: .planning/quick/260825-svs-regression-aus-phase-140-beheben-fehlend/260825-svs-SUMMARY.md
- FOUND: commit 6cddcb75
