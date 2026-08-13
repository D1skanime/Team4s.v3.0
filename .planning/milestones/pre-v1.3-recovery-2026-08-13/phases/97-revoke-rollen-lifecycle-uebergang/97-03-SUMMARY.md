---
phase: 97-revoke-rollen-lifecycle-uebergang
plan: 03
subsystem: frontend
tags: [typescript, fansub-members, historical-roles, date-inputs]

requires:
  - phase: 97-revoke-rollen-lifecycle-uebergang
    provides: 97-02 admin historical member/role date API
provides:
  - Date-shaped frontend types for historical fansub members and roles
  - Date inputs for historical member tenure and role tenure dialogs
  - Admin history table rendering for DATE values
affects: [fansub-admin-ui, historical-members, historical-roles]

tech-stack:
  added: []
  patterns: [ui Input type=date, date-string payload mapping]

key-files:
  modified:
    - frontend/src/types/fansub.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx

key-decisions:
  - "Only admin historical fansub member/role types moved to *_date fields; anime contribution and public/domain projection year contracts remain year-shaped until a dedicated contract change."
  - "Form state stores browser date strings directly and lets the backend perform final ISO date validation."

patterns-established:
  - "Historical member form fields use joinedDate/leftDate and payload joined_date/left_date."
  - "Historical role form fields use startedDate/endedDate and payload started_date/ended_date."

requirements-completed: [D-01, D-03]

duration: 30min
completed: 2026-07-01
---

# Phase 97-03: Frontend Date UI Summary

**Fansub historical member and role authoring now uses date strings and date inputs instead of year pickers.**

## Performance

- **Duration:** 30min
- **Completed:** 2026-07-01
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Updated historical fansub member and role TypeScript request/response types to `joined_date`, `left_date`, `started_date`, and `ended_date`.
- Updated the API normalizer for historical roles to consume the new backend date fields.
- Replaced `YearPicker` in the historical member and role dialogs with `Input type="date"` from `@/components/ui`.
- Updated form initialization, save payloads, date ordering validation, role sorting, and table display for date strings.
- Updated focused fansub member tests and mocks for date-shaped fixtures.

## Task Commits

1. **Task 1/2: Frontend historical member/role date types** - pending code commit.
2. **Task 2/2: Date input UI and tests** - pending code commit.

**Plan metadata:** pending this summary commit.

## Files Created/Modified

- `frontend/src/types/fansub.ts` - Historical admin member/role interfaces now use date fields.
- `frontend/src/lib/api.ts` - Historical role normalizer maps `started_date`/`ended_date`.
- `GroupHistRoleDialog.tsx` - Role date inputs for "Rolle von" and "Rolle bis".
- `GroupMemberFormModals.tsx` - Member date inputs for "Beitrittsdatum" and "Austrittsdatum".
- `useGroupMembersTab.ts` - Date-shaped form state, payloads, validation, and sorting.
- `GroupMembersHistTable.tsx` - Date display and coarse duration rendering.
- Focused tests - Updated fixtures and UI mocks for the date fields.

## Decisions Made

- Kept `frontend/src/types/domain-projection.ts` and `frontend/src/types/contributions.ts` unchanged because Plan 97-02 intentionally preserved those year-shaped public/profile contracts by deriving years from migrated DATE columns.
- Left anime contribution `started_year`/`ended_year` fields in `frontend/src/types/fansub.ts` untouched for the same contract reason.

## Deviations from Plan

### Intentional Scope Correction

**Plan mentioned domain projection and contribution type files**
- **Found during:** Frontend type inspection against the backend contract from Plan 97-02.
- **Issue:** Those files do not model the admin historical group-member API. Changing them here would drift runtime contracts that still return years.
- **Fix:** Changed only admin historical fansub member/role surfaces and documented the contract boundary.
- **Verification:** `tsc --noEmit` passed; grep shows remaining year fields only in unrelated contribution surfaces.

## Issues Encountered

- Full `npm run test -- --run --reporter=dot` did not pass within this phase scope: 8 unrelated frontend test files failed, mostly existing admin anime/create auth-loading expectations, Jellyfin asset URL expectation, and a ReleaseVersionNotesTab role-label expectation. The focused Phase-97 tests pass.

## Verification

- `cd frontend && npx tsc --noEmit` - passed.
- `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx" "src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx" "src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx"` - passed.
- Target grep for `YearPicker` in `GroupHistRoleDialog.tsx` and `GroupMemberFormModals.tsx` - no target imports remain.
- Edit-route grep for old historical form names found only unrelated anime contribution/release year surfaces and the shared `YearSelectField`.
- `cd frontend && npm run test -- --run --reporter=dot` - failed outside scope as documented above.

## User Setup Required

None.

## Next Phase Readiness

Wave 4 can now activate open-ended historical roles after claim verification and add the manual active-role assignment touchpoint.

---
*Phase: 97-revoke-rollen-lifecycle-uebergang*
*Completed: 2026-07-01*
