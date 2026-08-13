---
phase: 97-revoke-rollen-lifecycle-uebergang
plan: 04
subsystem: claims-and-active-roles
tags: [go, repository, permissions, fansub-members, react]

requires:
  - phase: 97-revoke-rollen-lifecycle-uebergang
    provides: 97-02 date-based historical role API
  - phase: 97-revoke-rollen-lifecycle-uebergang
    provides: 97-03 frontend date-shaped historical member/role types
provides:
  - Post-claim activation for open-ended historical group roles
  - Manual active-role assignment UI after claims with ended historical roles
  - Focused ClaimManagementPanel regression coverage
affects: [member-claims, fansub-group-active-roles, claim-management-ui]

tech-stack:
  added: []
  patterns: [post-commit fail-open activation, central api helper reuse, global ui primitives]

key-files:
  created:
    - backend/internal/repository/member_claims_role_activation_repository.go
    - frontend/src/app/admin/fansubs/[id]/edit/RoleAssignmentAfterClaim.tsx
  modified:
    - backend/internal/repository/member_claims_repository.go
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx

key-decisions:
  - "ResolvePendingRolesToActive runs after VerifyClaim commits and is fail-open; claim verification remains authoritative even if role activation logs an error."
  - "The D-06 manual assignment UI extends the canonical /admin/fansubs/[id]/edit ClaimManagementPanel rather than creating the planned non-existent members/[memberId] route file."
  - "Manual active-role assignment reuses updateFansubAppMemberRole from frontend/src/lib/api.ts and the member-scoped role-definition helper."

patterns-established:
  - "Open-ended historical roles auto-activate only when they are group-history whitelisted, known active group roles, and not fansub_lead/founder."
  - "Claim follow-up UI queues one assignment card after a verified claim only when the historical member has ended roles."

requirements-completed: [D-05, D-06, D-07, D-08]

duration: 45min
completed: 2026-07-01
---

# Phase 97-04: Claim Role Lifecycle Summary

**Verified member claims now bridge open-ended historical group roles into active app-member roles, with a manual UI path for ended-role follow-up.**

## Performance

- **Duration:** 45min
- **Completed:** 2026-07-01
- **Tasks:** 2
- **Files modified/created:** 6

## Accomplishments

- Added `MemberClaimsRepository.ResolvePendingRolesToActive`.
- Hooked `VerifyClaim` to call role activation after the claim transaction commits.
- Excluded `fansub_lead` and `founder` from automatic activation and kept `ON CONFLICT DO NOTHING` idempotency.
- Set `tenure_started_on` when active roles are inserted.
- Added `RoleAssignmentAfterClaim` to offer a clear "Aktive Rolle zuweisen" follow-up after claims whose historical roles are already ended.
- Reused `listFansubGroupRoleDefinitions`, `listMemberRoles`, and `updateFansubAppMemberRole` instead of adding ad hoc protected fetches.

## Task Commits

1. **Task 1/2: ResolvePendingRolesToActive + VerifyClaim hook** - pending this commit.
2. **Task 2/2: ClaimManagementPanel active-role assignment UI** - pending this commit.

## Files Created/Modified

- `backend/internal/repository/member_claims_role_activation_repository.go` - Fail-open post-claim active-role activation.
- `backend/internal/repository/member_claims_repository.go` - Post-commit activation hook.
- `RoleAssignmentAfterClaim.tsx` - Manual role assignment UI using global `Select` and `Button`.
- `ClaimManagementPanel.tsx` - Queues D-06 assignment after claim verification when ended roles exist.
- `ClaimManagementPanel.module.css` - Compact assignment layout and scoped success/error state.
- `ClaimManagementPanel.test.tsx` - Regression for D-06 assignment flow.

## Decisions Made

- Kept `fansub_lead` manual outside this generic SetRole UI. The role definition endpoint already excludes it, and the static fallback filters it out too.
- Used `permissions.IsKnownFansubGroupRole` in addition to `IsGroupHistoryWhitelistRole` before auto-inserting active roles.
- Kept permission resolution unchanged; D-07 is satisfied because capabilities still read from `fansub_group_member_roles`, and the new activation writes there.

## Deviations from Plan

### Canonical UI Route

**Planned path did not exist**
- **Found during:** Search-first gate for `ClaimManagementPanel`.
- **Issue:** The planned `frontend/src/app/admin/fansubs/[id]/members/[memberId]/ClaimManagementPanel.tsx` route/file is not present. The canonical group admin surface is `/admin/fansubs/[id]/edit`.
- **Fix:** Extended the existing `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` and extracted the follow-up assignment section.
- **Verification:** Focused ClaimManagementPanel test passes.

## Issues Encountered

- No phase-blocking issues. Existing skipped RED DB tests remain skipped in `member_claims_repository_claim_activation_test.go`; the reflection test now passes.

## Verification

- `cd backend && go build ./...` - passed.
- `cd backend && go test ./internal/repository/...` - passed.
- `cd frontend && npx tsc --noEmit` - passed.
- `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx"` - passed.
- `git diff --check` - passed.
- Grep verified `ResolvePendingRolesToActive`, `fansub_lead`/`founder` exclusions, `tenure_started_on`, and `ON CONFLICT (fansub_group_member_id, role) DO NOTHING`.
- Grep verified `backend/internal/permissions` still has no `hist_group_member_roles` dependency.

## User Setup Required

None.

## Next Phase Readiness

Wave 5 can now perform final verification, contracts/state cleanup, and any remaining lifecycle closeout checks.

---
*Phase: 97-revoke-rollen-lifecycle-uebergang*
*Completed: 2026-07-01*
