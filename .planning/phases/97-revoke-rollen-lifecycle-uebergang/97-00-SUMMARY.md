---
phase: 97-revoke-rollen-lifecycle-uebergang
plan: 00
subsystem: testing
tags: [go, vitest, fansub-members, role-lifecycle, dates]

requires:
  - phase: 97-revoke-rollen-lifecycle-uebergang
    provides: Phase 97 context and lifecycle decisions D-02/D-03/D-04/D-05
provides:
  - RED backend tests for historical role DATE fields and active/historical end-date semantics
  - RED backend contract check for claim role activation resolver
  - RED frontend tests for date inputs in the historical role dialog
affects: [fansub-members, historical-roles, member-claims, group-history-dialog]

tech-stack:
  added: []
  patterns: [RED-first lifecycle contract tests, reflection-based compatibility checks]

key-files:
  created:
    - backend/internal/repository/hist_group_member_roles_date_test.go
    - backend/internal/repository/hist_group_member_roles_helpers.go
    - backend/internal/repository/member_claims_repository_claim_activation_test.go
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx

key-decisions:
  - "Kept the temporary IsRoleActive helper reflection-based so RED tests compile before EndedDate exists."
  - "Extended the existing GroupHistRoleDialog test file instead of creating a parallel test file for the same component."

patterns-established:
  - "Backend lifecycle changes should first satisfy struct/method contract tests before DB-backed behavior tests are expanded."
  - "Frontend dialog changes should keep direct DOM checks for semantic controls such as input[type=date]."

requirements-completed: [D-02, D-03, D-04, D-05]

duration: 2h 10m
completed: 2026-07-01
---

# Phase 97-00: RED Test Scaffold Summary

**Role lifecycle tests now encode the missing DATE-field, end-date, claim-activation, and dialog date-input behavior before implementation.**

## Performance

- **Duration:** 2h 10m
- **Started:** 2026-07-01T12:57:11+02:00
- **Completed:** 2026-07-01T15:05:00+02:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added backend RED tests for `HistGroupMemberRoleRow.StartedDate` / `EndedDate` and the rule `ended_date IS NULL = active`.
- Added a backend RED contract test requiring `MemberClaimsRepository.ResolvePendingRolesToActive`.
- Added frontend RED checks that `GroupHistRoleDialog` renders date inputs for role start/end.

## Task Commits

1. **Task 1: Go RED tests** - `a5b947a9` (test)
2. **Task 2: Vitest RED tests** - `867831ae` (test)

**Plan metadata:** pending this summary commit.

## Files Created/Modified

- `backend/internal/repository/hist_group_member_roles_date_test.go` - Reflection-based tests for DATE fields and end-date active semantics.
- `backend/internal/repository/hist_group_member_roles_helpers.go` - Temporary `IsRoleActive` production helper kept below the plan's line limit.
- `backend/internal/repository/member_claims_repository_claim_activation_test.go` - Contract test for the future claim role activation resolver plus skipped scenario placeholders.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx` - Existing dialog test suite extended with semantic date-input assertions.

## Decisions Made

- Used reflection in `IsRoleActive` while `EndedDate` does not exist yet, so Wave 0 stays compile-clean and RED for the intended reason.
- Reused the existing component test file instead of adding a second file for the same dialog.

## Deviations from Plan

### Documented Deviations

**1. Existing frontend test file extended**
- **Found during:** Task 2 (Vitest RED test)
- **Issue:** The plan expected a new frontend test file, but `GroupHistRoleDialog.test.tsx` already existed.
- **Fix:** Extended the existing suite to avoid parallel component tests.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx`
- **Verification:** `npx vitest run "src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx"` ran the full suite.
- **Committed in:** `867831ae`

**2. Select assertion is already green**
- **Found during:** Task 2 (Vitest RED test)
- **Issue:** The plan expected all three new frontend checks to fail, but the select already exists in the current dialog.
- **Fix:** Kept the useful assertion as a regression guard and documented that only the two date-input checks are RED.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx`
- **Verification:** Vitest reported 7 tests total, 5 passed and 2 failed for missing `input[type="date"]`.
- **Committed in:** `867831ae`

---

**Total deviations:** 2 documented (reuse existing test file, already-green select assertion)
**Impact on plan:** No scope creep; the RED safety net for the missing implementation remains intact.

## Issues Encountered

- None blocking. The failing tests are expected RED failures for Wave 0.

## Verification

- `cd backend && go test ./internal/repository/...` - expected RED failure: missing `StartedDate` / `EndedDate` fields and missing `ResolvePendingRolesToActive`; no syntax error in the new test files.
- `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx"` - expected RED failure: missing `input[type="date"]`; select regression check already passes.
- `wc` equivalent showed `hist_group_member_roles_helpers.go` has 9 lines, within the <=15 line requirement.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 1 can now implement the database DATE migration and active role start-date column against explicit RED tests. Later waves should turn the frontend date-input and claim-activation checks green instead of replacing them.

---
*Phase: 97-revoke-rollen-lifecycle-uebergang*
*Completed: 2026-07-01*
