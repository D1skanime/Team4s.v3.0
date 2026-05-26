---
phase: 52-profile-account-return-refresh-flow
plan: 02
subsystem: ui
tags: [nextjs, profile, keycloak, ux-copy]
requires:
  - phase: 52-profile-account-return-refresh-flow
    provides: guarded return refresh mechanics
provides:
  - Clear Keycloak account CTA and Team4s-side return hint.
  - Calm success feedback only when account-card fields changed.
affects: [admin-profile, keycloak-handoff]
tech-stack:
  added: []
  patterns: [compact inline handoff hint, existing token-based styling]
key-files:
  created: []
  modified:
    - frontend/src/app/admin/profile/page.tsx
    - frontend/src/app/admin/profile/page.module.css
    - frontend/src/app/admin/profile/page.test.tsx
key-decisions:
  - "The CTA explicitly says Accountdaten bei Keycloak ändern so the external ownership is clear."
  - "The return hint appears only after the user opens Keycloak, keeping the default profile page calm."
patterns-established:
  - "External-account hints are contextual and scoped to the action area rather than a permanent global banner."
requirements-completed: [AUTH-PROFILE-ACCOUNT-RETURN-01]
duration: 10min
completed: 2026-05-26
---

# Phase 52 Plan 02: Account Handoff Copy Summary

**The profile page now explains the Keycloak new-tab handoff and shows account-refresh feedback only after real account-card changes.**

## Performance

- **Duration:** 10min
- **Started:** 2026-05-26T18:08:00+02:00
- **Completed:** 2026-05-26T18:18:00+02:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Renamed the account link to `Accountdaten bei Keycloak ändern`.
- Added a compact return hint after the Keycloak link is clicked.
- Styled the hint with existing page tokens and covered the copy in tests.

## Files Created/Modified

- `frontend/src/app/admin/profile/page.tsx` - Updates CTA copy and contextual hint.
- `frontend/src/app/admin/profile/page.module.css` - Adds the small local hint style.
- `frontend/src/app/admin/profile/page.test.tsx` - Pins copy and feedback behavior.

## Decisions Made

- The hint remains local to the avatar/action column to avoid turning the page into a global alert state.

## Deviations from Plan

None.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

Ready for Plan 03 focused checks and UAT documentation.

---
*Phase: 52-profile-account-return-refresh-flow*
*Completed: 2026-05-26*
