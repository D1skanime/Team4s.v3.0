---
phase: 66-claiming-verifizierung
plan: 00
subsystem: testing
tags: [go, vitest, nyquist, member-claims, verified-badge]
requires:
  - phase: 66-claiming-verifizierung
    provides: Phase 66 context, validation map, and research contract
provides:
  - Wave-0 backend test stubs for member claims, claim invitations, and noindex
  - Wave-0 frontend Vitest todo coverage anchor for VerifiedBadge
affects: [member_claims, member_claim_invitations, public_member_profile, me_profile]
tech-stack:
  added: []
  patterns:
    - Go test stubs use package-local tests with only testing imports
    - Vitest todo stubs avoid importing components that are implemented in later waves
key-files:
  created:
    - backend/internal/handlers/member_claims_handler_test.go
    - backend/internal/handlers/member_profile_noindex_test.go
    - backend/internal/repository/member_claims_repository_test.go
    - backend/internal/repository/member_claim_invitations_repository_test.go
    - frontend/src/components/profile/VerifiedBadge.test.tsx
  modified: []
key-decisions:
  - "Wave 0 kept all stubs free of production imports so later implementation waves can turn them green without pre-creating parallel seams."
patterns-established:
  - "Backend Phase 66 tests begin as t.Skip stubs in the owner packages."
  - "Frontend Phase 66 badge coverage begins as it.todo without importing a missing component."
requirements-completed:
  - P66-SC1
  - P66-SC2
  - P66-SC3
duration: 3 min
completed: 2026-06-02
---

# Phase 66 Plan 00: Wave-0 Test Stubs Summary

**Nyquist coverage anchors for member claiming, invitation verification, noindex, and the verified badge**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-02T17:14:00+02:00
- **Completed:** 2026-06-02T17:17:17+02:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added four backend Go test-stub files for claim handler, noindex handler, claim repository, and invitation repository behavior.
- Added a frontend Vitest todo stub for `VerifiedBadge` without importing the not-yet-created component.
- Verified the stubs through the targeted backend build and `VerifiedBadge` Vitest run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend-Test-Stubs anlegen** - `4fd73bac` (test)
2. **Task 2: Frontend-Vitest-Stub für VerifiedBadge anlegen** - `2e0753ae` (test)

## Files Created/Modified

- `backend/internal/handlers/member_claims_handler_test.go` - Handler test anchors for member search, claim submit, verify, and already-verified conflict.
- `backend/internal/handlers/member_profile_noindex_test.go` - Handler test anchors for owner-only and unauthorized noindex updates.
- `backend/internal/repository/member_claims_repository_test.go` - Repository test anchors for search, unique submit, one-verified invariant, and reject behavior.
- `backend/internal/repository/member_claim_invitations_repository_test.go` - Repository test anchors for token hash, create/accept, expiry, and cancelled states.
- `frontend/src/components/profile/VerifiedBadge.test.tsx` - Vitest todo anchors for icon, aria-label, and visible label behavior.

## Decisions Made

- Kept backend stubs limited to `testing` imports, preserving the plan's requirement that Wave 0 not import unimplemented production code.
- Kept the frontend stub as `it.todo()` entries so Vitest discovers the future coverage target without breaking before Wave 5.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `cd backend && go build ./internal/handlers/... ./internal/repository/...` - passed.
- `cd frontend && npm test -- --run VerifiedBadge` - passed with 3 todo tests.
- `rg` acceptance checks confirmed package declarations, `t.Skip` stubs, expected test names, `describe('VerifiedBadge')`, and no `./VerifiedBadge` import.

## Next Phase Readiness

Wave 1 can create `member_claim_invitations` migration 0092. The Wave 0 tests are intentionally stubbed and ready to be replaced or expanded by implementation waves.

---
*Phase: 66-claiming-verifizierung*
*Completed: 2026-06-02*
