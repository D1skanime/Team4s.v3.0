---
phase: quick-mt8
plan: 01
subsystem: auth
tags: [react, testing-library, vitest, useRef, platform-admin]

# Dependency graph
requires: []
provides:
  - "PlatformAdminGate no longer unmounts children on a background token refresh once a user has resolved once"
  - "Regression test proving children stay mounted across a simulated token refresh"
affects: [138-effective-rights-administration-impact-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolvedUserRef gate: use a ref (not state) to track whether an effect's expensive/loading branch has already succeeded once, so re-runs triggered by a changing dependency (e.g. token refresh) can skip the loading UI while still re-validating in the background."

key-files:
  created: []
  modified:
    - frontend/src/components/auth/PlatformAdminGate.tsx
    - frontend/src/components/auth/PlatformAdminGate.test.tsx

key-decisions:
  - "resolvedUserRef is reset to null only on the unauthenticated branch (no access token and no refresh token); it is intentionally left intact on a re-validation error so a previously-admitted user does not fall back into the loading state on a background failure — the existing errorMessage check already routes to the permission/error view."

patterns-established:
  - "resolvedUserRef gate: only show a loading fallback on the effect's first successful resolution; subsequent dependency-triggered re-runs stay in the background."

requirements-completed: []

# Metrics
duration: ~10min
completed: 2026-08-23
---

# Quick Task 260823-mt8: Fix PlatformAdminGate children unmount on token refresh Summary

**Guarded PlatformAdminGate's `setIsLoading(true)` behind a `resolvedUserRef` so a background token refresh no longer unmounts already-rendered children (e.g. open dialogs, in-progress forms) while re-validating admin access.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 1 completed
- **Files modified:** 2

## Accomplishments
- `PlatformAdminGate.tsx`'s resolution effect now only sets `isLoading(true)` on the very first resolution (tracked via `resolvedUserRef`), not on every re-run of the effect (which happens whenever `hasAccessToken` flips, e.g. on a token refresh).
- Re-validation failures after a user already resolved once still correctly route to the error/permission view via the existing `errorMessage` check, without a loading-state detour.
- New regression test proves a persistent child (`data-testid="persistent-child"`) stays mounted continuously across a simulated token refresh where the second `getCurrentUser()` call is left pending in the background.

## Task Commits

1. **Task 1: Fix loading-state gate and add token-refresh regression test** - `37859778` (fix)

**Plan metadata:** (docs commit handled separately by orchestrator)

## Files Created/Modified
- `frontend/src/components/auth/PlatformAdminGate.tsx` - Added `resolvedUserRef` (via `useRef`); `setIsLoading(true)` is now gated on `resolvedUserRef.current === null`; ref is set after a successful `getCurrentUser()` resolution and reset only on the unauthenticated branch.
- `frontend/src/components/auth/PlatformAdminGate.test.tsx` - Added a new test simulating a token refresh (changed `hasAccessToken` via `useAuthSessionMock.mockReturnValueOnce`) with a deliberately pending second `getCurrentUser()` call, asserting the persistent child never disappears and the loading fallback text never reappears.

## Decisions Made
- `resolvedUserRef.current` is left intact on a catch/error branch (not reset), matching the plan's explicit instruction — a user who already resolved once must not fall back into the loading state on a subsequent re-validation failure; the render's `errorMessage` truthy check already routes to the permission/error view regardless of `isLoading`.

## Deviations from Plan

None - plan executed exactly as written. One minor test-quality addition beyond the plan's literal test description: wrapped the deferred promise's resolution in `await act(async () => { ... })` at the end of the new test to avoid an act() warning leaking a pending state update past test completion — a test-hygiene addition, not a behavior change, and does not affect the assertions the plan specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `PlatformAdminGate` now safely preserves child component state (open dialogs, in-progress forms) across background token refreshes, which is a precondition noted in the plan for Phase 138's upcoming Impact-Preview confirmation flow.
- All 4 tests in `PlatformAdminGate.test.tsx` pass (3 pre-existing + 1 new regression test); no other files or test suites touched.

---
*Quick task: 260823-mt8*
*Completed: 2026-08-23*

## Self-Check: PASSED

- FOUND: frontend/src/components/auth/PlatformAdminGate.tsx
- FOUND: frontend/src/components/auth/PlatformAdminGate.test.tsx
- FOUND: .planning/quick/260823-mt8-fix-platformadmingate-children-unmount-o/260823-mt8-SUMMARY.md
- FOUND: commit 37859778
