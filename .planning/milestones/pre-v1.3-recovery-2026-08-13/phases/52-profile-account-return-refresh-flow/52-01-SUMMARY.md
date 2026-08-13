---
phase: 52-profile-account-return-refresh-flow
plan: 01
subsystem: auth-ui
tags: [nextjs, react, keycloak, profile, tests]
requires:
  - phase: 51-keycloak-access-token-resource-server-boundary
    provides: central auth session refresh and profile API boundaries
provides:
  - Profile page refreshes account cards after Keycloak return through central auth and profile APIs.
  - Regression tests cover return refresh, changed account data, unchanged quiet path, dirty form preservation, and duplicate focus protection.
affects: [admin-profile, auth-boundary, keycloak-handoff]
tech-stack:
  added: []
  patterns: [guarded focus/visibility return refresh, dirty form preservation]
key-files:
  created: []
  modified:
    - frontend/src/app/admin/profile/page.tsx
    - frontend/src/app/admin/profile/page.test.tsx
    - frontend/src/lib/api.no-token-boundary.test.ts
key-decisions:
  - "Profile UI uses refreshActiveAuthSession() from the central API module rather than direct Keycloak helper access."
  - "Return refresh updates account cards through getOwnProfile() and does not overwrite dirty Team4s profile form fields."
patterns-established:
  - "External auth handoff refresh starts only after the user clicks the Keycloak account link."
requirements-completed: [AUTH-PROFILE-ACCOUNT-RETURN-01]
duration: 20min
completed: 2026-05-26
---

# Phase 52 Plan 01: Profile Account Return Refresh Mechanics Summary

**Guarded Keycloak-return refresh updates profile account cards through central auth/profile APIs while preserving unsaved Team4s form edits.**

## Performance

- **Duration:** 20min
- **Started:** 2026-05-26T18:00:00+02:00
- **Completed:** 2026-05-26T18:17:00+02:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added a post-Keycloak return refresh path using `refreshActiveAuthSession()` followed by `getOwnProfile()`.
- Preserved dirty Team4s profile form state while still updating read-only account cards.
- Added regression coverage for changed account data, unchanged quiet path, dirty form preservation, and duplicate focus events.

## Files Created/Modified

- `frontend/src/app/admin/profile/page.tsx` - Adds guarded focus/visibility return refresh and dirty-form tracking.
- `frontend/src/app/admin/profile/page.test.tsx` - Covers the return refresh behavior and next/image mock cleanup.
- `frontend/src/lib/api.no-token-boundary.test.ts` - Narrows the boundary rule to allow this specific central refresh seam.

## Decisions Made

- Team4s-side refresh is enough for this phase; no direct Keycloak helpers are used in the profile UI.
- Account-change detection compares the account-card fields only: display name, email, status, and roles.

## Deviations from Plan

None - plan executed within the specified auth/UI boundary.

## Issues Encountered

The existing auth boundary test originally treated `refreshActiveAuthSession` like a forbidden lifecycle helper in all app surfaces. The rule was tightened to allow only the profile page's central API seam usage while still blocking direct Keycloak lifecycle helpers elsewhere.

## User Setup Required

None.

## Next Phase Readiness

Ready for Plan 02 handoff copy and styling.

---
*Phase: 52-profile-account-return-refresh-flow*
*Completed: 2026-05-26*
