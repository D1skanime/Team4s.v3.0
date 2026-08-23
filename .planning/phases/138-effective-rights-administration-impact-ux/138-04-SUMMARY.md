---
phase: 138-effective-rights-administration-impact-ux
plan: 04
subsystem: api
tags: [go, gin, permissions, effective-rights, resolver, openapi, typescript]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: "ResolveGroupRights central precedence resolver, EffectiveRightState DTO, effectiveRightStatesFromResolution projection helper"
  - phase: 138-01
    provides: "AuthzRepository.ListRoleHolders and the fansub_group_member_roles/app_users test-support schema"
provides:
  - "permissions.Service.PreviewGroupRightsWithRoleChange(ctx, actor, fansubGroupID, roleCode, add) (before, after *GroupRightsResolution, error)"
  - "permissions.Service.loadGroupRightsSources (extracted, behavior-preserving helper reused by ResolveGroupRights and the new preview method)"
  - "GET /admin/fansubs/:id/app-members/:appUserId/role-assignment-impact -- read-only, group-scoped before/after effective-rights diff for a hypothetical role assign/revoke"
  - "handlers.RoleAssignmentImpactPreview DTO + shared/contracts/admin-capabilities.yaml schema/path + frontend/src/types/admin-capability.ts + frontend/src/lib/api.ts#getRoleAssignmentImpactPreview"
affects: [138-05, 138-06, 138-07, 138-08, "effective-rights admin UI plans consuming role-assignment impact preview"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Preview-before-mutate: a read-only preview endpoint sits ahead of an existing live mutation, reusing that mutation's exact authorization action and validation instead of a looser or duplicated gate"
    - "Synthetic-input reuse: hypothetical before/after states are computed by feeding a synthetically modified in-memory input twice through the SAME pure decision function, never a second engine"

key-files:
  created:
    - backend/internal/permissions/effective_rights_role_assignment_preview.go
    - backend/internal/permissions/effective_rights_role_assignment_preview_test.go
    - backend/internal/handlers/admin_role_assignment_impact_handler.go
    - backend/internal/handlers/admin_role_assignment_impact_handler_test.go
  modified:
    - backend/internal/permissions/effective_rights.go
    - backend/internal/handlers/admin_effective_rights_handler.go
    - backend/internal/handlers/capability_policy_contract.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "loadGroupRightsSources returns (groupRightsSources, fastPathBool, error) exactly per the plan's literal interface; the pre-condition guard clauses (nil service/resolver, invalid actor, invalid group) intentionally stay in ResolveGroupRights rather than moving into loadGroupRightsSources, since they resolve to a denyAllGroupRights reason code that differs from the platform-admin/disabled fast-path's evaluateGroupRights(empty sources) answer -- collapsing them would have changed observable behavior for the nil-resolver/invalid-input cases"
  - "PreviewGroupRightsWithRoleChange replicates ResolveGroupRights' same guard clauses defensively (nil service/resolver, invalid actor, invalid group) before calling loadGroupRightsSources, since the plan's interface block did not specify guard behavior for the new method and it is a public entry point that must not nil-panic on misuse"
  - "loadEffectiveRightsTargetActorState (target-membership + platform-admin lookup) extracted as a package-level function shared by AdminEffectiveRightsHandler and the new AdminRoleAssignmentImpactHandler, per the plan's explicit 'not a duplicated copy' instruction"

patterns-established:
  - "loadGroupRightsSources is now the single batch-load seam for both real-time enforcement (ResolveGroupRights) and hypothetical preview (PreviewGroupRightsWithRoleChange) -- any future 'what if the sources were different' feature should reuse this same extraction rather than re-deriving sources ad hoc"

requirements-completed: [CAP-09]

# Metrics
duration: ~9min
completed: 2026-08-23
---

# Phase 138 Plan 04: Role-Assignment Impact Preview Summary

**Read-only GET endpoint previewing a full before/after effective-rights diff for a hypothetical role assign/revoke on one user, computed by feeding the existing pure precedence evaluator a synthetically modified role set (zero new decision logic).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-08-23T16:59:24Z (previous plan's completion commit)
- **Completed:** 2026-08-23T17:08:10Z
- **Tasks:** 2 completed
- **Files modified:** 9 (4 created, 5 modified)

## Accomplishments
- `permissions.Service.PreviewGroupRightsWithRoleChange` computes both sides of a hypothetical role-assignment diff by calling `evaluateGroupRights` twice against a synthetically modified role list -- no second, independently-computed decision engine (D-20, binding)
- `ResolveGroupRights` refactored (extraction only) into `loadGroupRightsSources` + `evaluateGroupRights`, proven zero-regression against the full pre-existing `effective_rights_test.go` fixture suite
- New `GET /admin/fansubs/:id/app-members/:appUserId/role-assignment-impact` endpoint, authorized via the exact same action (`ActionFansubGroupMembersManage`) and role validation (`IsKnownFansubGroupRole`) as the live mutation it previews (T-138-07)
- Full D-35 contract chain closed: Go DTO -> `shared/contracts/admin-capabilities.yaml` -> `frontend/src/types/admin-capability.ts` -> `frontend/src/lib/api.ts#getRoleAssignmentImpactPreview`

## Task Commits

1. **Task 1: Permissions-package refactor + new preview method + unit tests** - `edcc427d` (feat)
2. **Task 2: Handler, route, wiring, and contract chain** - `5afa43d0` (feat)

_No separate plan-metadata commit was requested by the orchestrator wrapper for this session; this SUMMARY's own commit closes the plan._

## Files Created/Modified
- `backend/internal/permissions/effective_rights.go` - extracted `loadGroupRightsSources`; `ResolveGroupRights` is now a thin caller
- `backend/internal/permissions/effective_rights_role_assignment_preview.go` - new `PreviewGroupRightsWithRoleChange` + `modifiedRoles` helper (add/dedup, remove/filter)
- `backend/internal/permissions/effective_rights_role_assignment_preview_test.go` - 6 unit tests: gained, retained-via-other-role, lost, partial-removal-retains-access, platform-admin no-op, disabled-actor no-op
- `backend/internal/handlers/admin_role_assignment_impact_handler.go` - new `AdminRoleAssignmentImpactHandler.PreviewRoleAssignment`
- `backend/internal/handlers/admin_role_assignment_impact_handler_test.go` - 5 handler tests: 200 happy path, 403 unauthorized, 400 unknown role, 400 invalid change, 404 foreign target
- `backend/internal/handlers/admin_effective_rights_handler.go` - extracted `loadEffectiveRightsTargetActorState` for reuse; `loadTargetActorState` now delegates to it
- `backend/internal/handlers/capability_policy_contract.go` - added `RoleAssignmentImpactPreview` DTO
- `backend/cmd/server/admin_routes.go` - registered the new route + `adminRouteHandlers` field
- `backend/cmd/server/main.go` - wired `NewAdminRoleAssignmentImpactHandler` (reuses `permissionSvc`/`effectiveRightsOverrideRepo`/`authzRepo`, no new repository)
- `shared/contracts/admin-capabilities.yaml` - new path + `RoleAssignmentImpactPreview` schema
- `frontend/src/types/admin-capability.ts` - `RoleAssignmentImpactPreview` TS interface
- `frontend/src/lib/api.ts` - `getRoleAssignmentImpactPreview` helper (unwraps the `{"data": ...}` envelope)

## Decisions Made
- `loadGroupRightsSources` signature matches the plan's literal `(groupRightsSources, bool, error)` interface exactly; the pre-condition guard clauses stay in `ResolveGroupRights` (see key-decisions above for rationale)
- `PreviewGroupRightsWithRoleChange` defensively replicates those same guard clauses before delegating to `loadGroupRightsSources`, since it is a new public entry point and the plan's interface block did not specify guard behavior for it
- Target-actor resolution logic (`loadEffectiveRightsTargetActorState`) extracted to a shared package-level function per the plan's explicit "not a duplicated copy" instruction, reused by both `AdminEffectiveRightsHandler` and the new handler

## Deviations from Plan

None - plan executed exactly as written. The `loadGroupRightsSources` extraction and `PreviewGroupRightsWithRoleChange` implementation followed the interfaces block precisely; the only interpretive choice (where exactly the pre-condition guard clauses live) is documented above under Decisions Made and does not change any observable behavior of `ResolveGroupRights`.

## Issues Encountered
None. `go build ./...`, `go vet`, the full `internal/permissions` suite, and the 5 new/all `TestAdminRoleAssignmentImpactHandler*` handler tests all pass on the first attempt after implementation.

**Pre-existing, out-of-scope test failures observed (not caused by this plan):** running `go test ./internal/handlers/...` shows ~16 failures (`TestCreateAnimeSegment_RangeAutoAssign*`, `TestGetEffectiveContributionsForVersion`, `TestAdminFansubReleases_*`, `TestReleaseVersionMedia_CapabilitiesExposeOwnDelete`, `TestListFansubGroupAppMembersAllowsOwnGroupLead`, `TestCreateFansubGroupAppMember*`, `TestPhase128PublicMemberAccessMatrix`) in files this plan never touched. This matches STATE.md's already-documented Blockers/Concerns entry: "internal/handlers package tests: ~20 tests across ~10 files ... depend on permissions.roleAllows/RoleAllowsAction but never call permissions.Service.LoadCache, so they always observe a nil cache and deny/return false regardless of real role_capabilities data. Pre-existing, verified not caused by Phase 137." No new failures were introduced; the new `TestAdminRoleAssignmentImpactHandler*` tests and the full `internal/permissions` suite (including the pre-existing `TestResolveGroupRights*` fixture matrix) are all green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `PreviewGroupRightsWithRoleChange` and its HTTP boundary are ready for a later Phase-138 UI plan to wire an "Auswirkung anzeigen" preview into the existing role-assign/remove admin UI ahead of calling `SetFansubGroupMemberRole`
- `getRoleAssignmentImpactPreview` is exported from `frontend/src/lib/api.ts` and typed, but not yet consumed by any component -- frontend wiring is explicitly out of this plan's backend-only scope (files_modified list contains no `.tsx` files)
- No blockers for subsequent 138-0x plans

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*
