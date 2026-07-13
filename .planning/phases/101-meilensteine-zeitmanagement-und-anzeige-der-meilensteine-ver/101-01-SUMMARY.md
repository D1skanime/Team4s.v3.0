---
phase: 101-meilensteine-zeitmanagement-und-anzeige-der-meilensteine-ver
plan: "01"
subsystem: frontend
tags: [react, vitest, yearpicker, fansub-groups, milestones]

requires:
  - phase: 100-fansub-erfolge-freischaltlogik-und-meilenstein-katalog
    provides: achievement-specific milestone unlock rules and catalog fixtures
provides:
  - staged milestone option visibility before backend enforcement
  - dynamic YearPicker min/max wiring for group history entries
  - focused regression coverage for milestone selector staging and year bounds
affects: [phase-101-plan-02, fansub-group-history, group-history-form]

tech-stack:
  added: []
  patterns:
    - "Pure option gating stays in buildHistoryEventOptions"
    - "GroupHistoryForm delegates year constraints to the existing YearPicker primitive"

key-files:
  created: []
  modified:
    - frontend/src/components/groups/GroupHistorySection.tsx
    - frontend/src/components/groups/GroupHistorySection.test.ts
    - frontend/src/components/groups/GroupHistoryForm.tsx
    - frontend/src/components/groups/GroupHistoryForm.test.tsx

key-decisions:
  - "Full milestone catalog unlocks from persisted first_project and first_release history entries, not from coverage booleans alone."
  - "Year bounds are enforced in the existing YearPicker UI seam; backend request validation remains deferred to 101-02."

patterns-established:
  - "Later-catalog tests must include first_project and first_release entries when exercising Phase 100 per-achievement rules."
  - "Group history forms receive minYear/maxYear props from their owning section."

requirements-completed:
  - "Phase 101 D-01"
  - "Phase 101 D-02"
  - "Phase 101 D-03"
  - "Phase 101 D-04"
  - "Phase 101 D-05"
  - "Phase 101 D-06"

duration: 5min
completed: 2026-07-13
---

# Phase 101 Plan 01: Frontend-Regelfundament Summary

**Staged fansub milestone selector with founded-year/current-year picker bounds and focused regression coverage**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-13T08:27:30Z
- **Completed:** 2026-07-13T08:32:37Z
- **Tasks:** 4 completed
- **Files modified:** 4 implementation/test files

## Accomplishments

- Added RED/GREEN coverage for the staged milestone selector: no founding year, first-step-only catalog, full-catalog unlock, and edit-target escape hatch.
- Implemented `fullCatalogUnlocked` gating in `buildHistoryEventOptions` while preserving existing disabled reasons and single-use hiding behavior.
- Added form tests for dynamic year bounds and threaded `minYear`/`maxYear` into the existing `YearPicker`.
- Passed focused tests, frontend typecheck, and whitespace checks.

## Task Commits

1. **Task 1: Add RED tests for staged milestone visibility** - `33922fe1` (test)
2. **Task 2: Implement staged option gating in buildHistoryEventOptions** - `7b9c5671` (feat)
3. **Task 3: Add RED tests for dynamic YearPicker bounds** - `ac55aa90` (test)
4. **Task 4: Thread year bounds from GroupHistorySection into GroupHistoryForm** - `22f26701` (feat)

## Files Created/Modified

- `frontend/src/components/groups/GroupHistorySection.tsx` - Adds founded-year and first-project/first-release stage gating, then passes dynamic year bounds to the form.
- `frontend/src/components/groups/GroupHistorySection.test.ts` - Covers the new staged selector behavior and updates later-catalog fixtures to satisfy the new unlock precondition.
- `frontend/src/components/groups/GroupHistoryForm.tsx` - Adds optional `minYear`/`maxYear` props and keeps the current year as the fallback upper bound.
- `frontend/src/components/groups/GroupHistoryForm.test.tsx` - Covers founding-year lower bound, current-year upper bound, and founding suggested-year prefill.

## Decisions Made

- Full catalog visibility is based on actual `first_project` and `first_release` history entries so the selector reflects the milestone timeline, not only backend coverage flags.
- The frontend lower and upper year bounds reuse the existing `YearPicker`; no duplicate year control was introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated later-catalog test fixtures for the new stage precondition**
- **Found during:** Task 2 (Implement staged option gating in buildHistoryEventOptions)
- **Issue:** Existing Phase 100 tests for website launch, count achievements, project completion, collaboration, and revival exercised later-catalog rules without `first_project` and `first_release` entries. After the new gate, those tests were passing/failing for the stage gate instead of their intended per-achievement rules.
- **Fix:** Added `unlockedHistoryEntries()` and used it in later-catalog tests so the old per-achievement rule coverage still runs behind the full-catalog unlock.
- **Files modified:** `frontend/src/components/groups/GroupHistorySection.test.ts`
- **Verification:** `npm --prefix frontend test -- GroupHistorySection.test.ts`
- **Committed in:** `7b9c5671`

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Test-only fixture alignment required by the planned behavior; no product scope added.

## Issues Encountered

None.

## Known Stubs

None. The only stub-scan hits in modified files were normal form placeholder strings, not inert data or mock UI.

## Authentication Gates

None.

## Verification

- `npm --prefix frontend test -- GroupHistorySection.test.ts GroupHistoryForm.test.tsx` - passed, 47 tests
- `npm --prefix frontend run typecheck` - passed
- `git diff --check` - passed

## Next Phase Readiness

Ready for 101-02. Frontend option visibility and YearPicker bounds are now in place; backend validation still needs to reject direct API create/update requests with `year < founded_year` or `year > current year`.

## Self-Check: PASSED

- Found all modified implementation/test files and the summary file.
- Found all task commits: `33922fe1`, `7b9c5671`, `ac55aa90`, `22f26701`.

---
*Phase: 101-meilensteine-zeitmanagement-und-anzeige-der-meilensteine-ver*
*Completed: 2026-07-13*
