---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 16
subsystem: ui
tags: [react, nextjs, typescript, vitest, release-review]

# Dependency graph
requires:
  - phase: 141
    provides: actor-decidable release-review queue/detail with submitDecision and honest Next control
provides:
  - client-side detail.status patch on successful review decision so the header status Badge and decision message never contradict each other after confirm/reject
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["functional setState updater to patch a derived-display field immediately after a mutation succeeds, without a refetch"]

key-files:
  created: []
  modified:
    - "frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx"
    - "frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx"

key-decisions:
  - "Patched detail.status using the already-in-scope decision parameter ('confirm'/'reject'), not response.data.decision, since they are identical and avoid an extra property lookup"
  - "Used setDetail's functional-updater form to avoid racing a stale closure, and guarded null to leave detail unchanged if somehow absent"
  - "No refetch/reload added after decision success, since that would re-trigger isLoading/LoadingState and hide the just-shown decision message and NextReviewControl success actions"

patterns-established:
  - "Client-side optimistic status patch derived only from a value the same authorized request already had the server accept, not from user-controlled input"

requirements-completed: ["UAT-01"]

# Metrics
duration: 5min
completed: 2026-09-02
---

# Phase 143 Plan 16: Fix stale header status Badge after review decision Summary

**submitDecision now patches detail.status client-side via setDetail's functional updater immediately after a successful confirm/reject, so the header Badge and decision message never contradict each other without a page reload.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-02T08:26:44Z
- **Completed:** 2026-09-02T08:27:51Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Header status Badge on the review-detail page now updates immediately to "Bestätigt / Öffentlich" or "Abgelehnt" after a successful decision, matching the decision-panel message below it (closes UAT-01)
- Two new regression tests lock this behavior for both the confirm path and the reject-via-modal path
- File stayed within the project's 450-line cap (447/450 lines, one new line added)

## Task Commits

Each task was committed atomically:

1. **Task 1: Patch detail.status on successful decision** - `1c9b96d8` (fix)
2. **Task 2: Add regression tests proving the Badge updates after a decision** - `99050a8d` (test)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` - `submitDecision`'s success branch now also calls `setDetail((previous) => ...)` to patch `status` to `confirmed`/`rejected` based on the `decision` parameter
- `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx` - New `describe('header status Badge reflects the decision (UAT-01)', ...)` block with a confirm-case and a reject-case test, both asserting the Badge text changes and "In Prüfung" disappears

## Decisions Made
- Used the `decision` parameter (not `response.data.decision`) to compute the new status, per the plan's interfaces block, since both values are equivalent and this avoids an extra property lookup
- Kept the change to a single new statement (functional `setDetail` updater) to respect the file's 450-line budget

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

UAT-01 is closed. No blockers for remaining gap-closure plans (UAT-02, UAT-03 already closed by 143-15, UAT-04 also closed by 143-15) in this wave.

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx
- FOUND: frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx
- FOUND commit: 1c9b96d8
- FOUND commit: 99050a8d

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-02*
