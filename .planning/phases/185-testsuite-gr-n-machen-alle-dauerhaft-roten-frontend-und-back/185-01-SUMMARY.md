---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 01
subsystem: testing
tags: [vitest, openapi, contract-test, frontend]

# Dependency graph
requires:
  - phase: 182-03
    provides: "openapi.yaml AnimeRelation schema with cover_image correctly marked nullable but not required"
provides:
  - "Frontend test suite with 0 permanently-red tests (anime-detail-contract.test.ts now 4/4 passing)"
affects: [185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Per-key contract-loop assertions can be exempted individually via early `continue` when a specific field's contract shape (required vs. properties-only) is intentionally asymmetric"]

key-files:
  created: []
  modified: [frontend/src/types/__tests__/anime-detail-contract.test.ts]

key-decisions:
  - "Left shared/contracts/openapi.yaml untouched — the contract was already correct per 182-03; only the test's stale expectation needed to change (D-01)"
  - "Exempted only the required-block assertion for cover_image; left the properties-block presence check, the nullable:true count, and all other keys' required-block checks unchanged"

patterns-established: []

requirements-completed: [D-01]

# Metrics
duration: 8min
completed: 2026-10-16
---

# Phase 185 Plan 01: Fix permanently-red anime-detail-contract test Summary

**anime-detail-contract.test.ts's per-key required-block loop now skips `cover_image` via an early `continue`, matching the already-correct openapi.yaml contract where `cover_image` is nullable but intentionally not required.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-16T19:53:00Z
- **Completed:** 2026-10-16T20:01:20Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments
- The only permanently-red frontend test (`anime-detail-contract.test.ts`, test `'preserves the complete relation payload including nullable cover and year'`) now passes.
- Full frontend suite verified green: 390 test files passed (1 pre-existing unrelated skip), 3548 tests passed (3 pre-existing todo), exit code 0, no regressions introduced.

## Task Commits

Each task was committed atomically:

1. **Task 1: Exempt cover_image from the required-block assertion only** - `9e0e508b8` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/types/__tests__/anime-detail-contract.test.ts` - Added `if (key === 'cover_image') continue` inside the per-key loop so the `required:`-block containment check is skipped for `cover_image` while the properties-block presence check still runs for every key including `cover_image`.

## Decisions Made
- Confirmed via `grep -n "AnimeRelation:" -A 30 shared/contracts/openapi.yaml` that the contract's `required:` list is exactly `anime_id, title, relation_type, year, type` (no `cover_image`), and that `cover_image`/`year` are the only two `nullable: true` properties — matching the plan's documented contract reality exactly, so no contract change was needed.
- Did not touch the `nullable: true` count assertion, the `year` handling, or the other 3 tests in the file, per the plan's acceptance criteria.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Frontend test suite is now fully green (390/390 files passing, 1 pre-existing skip unrelated to this plan).
- Remaining plans in phase 185 cover backend permanently-red clusters (per 185-CONTEXT.md D-02 through D-07); this plan only closed the single frontend cluster (D-01).

## Self-Check: PASSED

- FOUND: frontend/src/types/__tests__/anime-detail-contract.test.ts
- FOUND: commit 9e0e508b8 (`git log --oneline --all | grep 9e0e508b8`)

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*
