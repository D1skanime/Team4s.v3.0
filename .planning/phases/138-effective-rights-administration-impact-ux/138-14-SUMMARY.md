---
phase: 138-effective-rights-administration-impact-ux
plan: 14
subsystem: auth
tags: [go, gin, react, effective-rights, member-claims, admin-ui]

# Dependency graph
requires:
  - phase: 138-04
    provides: loadGroupRightsSources/evaluateGroupRights extraction, ResolveGroupRights reuse pattern for impact previews
  - phase: 138-10
    provides: central Claims workspace (ClaimsClient.tsx) with an intentionally empty Aktion column
provides:
  - "Zero-write PreviewActivatableRoles on MemberClaimsRepository (mirrors ActivateClaimedMember steps 1-2 without step 3)"
  - "permissions.Service.PreviewClaimActivationImpact: real before/after diff for the one claim decision that changes rights"
  - "GET /admin/fansubs/:id/historical-members/:memberId/claim-activation-impact HTTP boundary"
  - "ClaimDecisionImpactPanel wired into ClaimsClient.tsx's Aktion column for verify/activate/reject"
affects: [138-effective-rights-administration-impact-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Claim-decision impact preview: real ActivateClaimedMember diff, honest no-change copy for VerifyClaim/RejectClaim (D-24)"
    - "Self-fetch listRoleCapabilities inside a modal when the parent workspace has not already loaded the action matrix (mirrors 138-13 precedent)"

key-files:
  created:
    - backend/internal/permissions/effective_rights_claim_activation_preview.go
    - backend/internal/permissions/effective_rights_claim_activation_preview_test.go
    - backend/internal/handlers/admin_claim_activation_impact_handler.go
    - backend/internal/handlers/admin_claim_activation_impact_handler_test.go
    - frontend/src/app/admin/claims/ClaimDecisionImpactPanel.tsx
    - frontend/src/app/admin/claims/ClaimDecisionImpactPanel.test.tsx
  modified:
    - backend/internal/repository/member_claims_activate_repository.go
    - backend/internal/handlers/capability_policy_contract.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/claims/ClaimsClient.tsx

key-decisions:
  - "The preview handler reuses the EXACT same authorization action (ActionFansubGroupHistoricalMembersLink) VerifyClaim/ActivateClaimedMember already require, not a new gate"
  - "VerifyClaim/RejectClaim never fetch or fabricate a rights diff -- they render the D-24-locked honest 'no change' copy directly"
  - "ClaimDecisionImpactPanel self-fetches listRoleCapabilities for action labels (mirrors 138-13's RoleCapabilityImpactPreviewModal precedent), since ClaimsClient.tsx does not already hold a loaded capability matrix"

patterns-established:
  - "Zero-write preview repository methods extract-and-reuse an existing mutation's read-only steps rather than duplicating queries"

requirements-completed: []

# Metrics
duration: 20min
completed: 2026-08-23
---

# Phase 138 Plan 14: Claim-Activation Impact Preview (D-24) Summary

**Real resolver-backed before/after effective-rights diff for ActivateClaimedMember only; VerifyClaim/RejectClaim honestly state no rights change, closing D-24 in the central Claims workspace.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23T18:50:00Z
- **Completed:** 2026-08-23T19:00:42Z
- **Tasks:** 2 completed
- **Files modified:** 14 (6 created, 8 modified)

## Accomplishments

- Added `PreviewActivatableRoles` (zero-write) to `MemberClaimsRepository`, mirroring `ActivateClaimedMember`'s steps 1-2 (find the verified claim's `app_user_id`, collect activatable non-governance historical roles) without ever performing step 3 (`EnsureInvitationAcceptance`).
- Added `permissions.Service.PreviewClaimActivationImpact`, reusing the real, unmodified `ResolveGroupRights` for "before" (naturally resolves to `no_active_membership` deny-all since the target is not yet active) and `loadGroupRightsSources` + `evaluateGroupRights` for "after" (overrides `ActiveMembership=true`/`Roles=roleCodes` while preserving any pre-existing specialized grants, e.g. review delegation).
- Added `ClaimActivationImpactPreview` DTO, `AdminClaimActivationImpactHandler`, and the new route `GET /admin/fansubs/:id/historical-members/:memberId/claim-activation-impact`, gated by the exact `ActionFansubGroupHistoricalMembersLink` action `VerifyClaim`/`ActivateClaimedMember` already require, refusing with the same `no_activatable_roles` shape ActivateClaimedMember itself would use when zero roles are activatable.
- Built `ClaimDecisionImpactPanel` and wired it into `ClaimsClient.tsx`'s previously-empty Aktion column: pending claims get Verifizieren/Ablehnen (locked honest "no rights change" copy, zero preview fetch), verified claims get "Als aktives Mitglied übernehmen" (real gained/lost/unchanged summary + changed-only table, reusing `RoleAssignmentImpactModal`'s rendering approach).

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend — non-mutating role preview + resolver-backed impact + handler/route** - `ca0c8dbe` (feat)
2. **Task 2: ClaimDecisionImpactPanel + contract chain + wiring into ClaimsClient** - `59e0d40b` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `backend/internal/repository/member_claims_activate_repository.go` - Added `PreviewActivatableRoles` (zero-write twin of `ActivateClaimedMember`'s steps 1-2)
- `backend/internal/permissions/effective_rights_claim_activation_preview.go` - New `PreviewClaimActivationImpact`, reusing `ResolveGroupRights`/`loadGroupRightsSources`/`evaluateGroupRights`
- `backend/internal/permissions/effective_rights_claim_activation_preview_test.go` - Fixture-driven proofs: zero-sources gain, pre-existing specialized grant preserved, empty roleCodes still flips membership
- `backend/internal/handlers/admin_claim_activation_impact_handler.go` - New handler, group-scoped auth mirroring `requireFansubPermission`, `no_activatable_roles` refusal
- `backend/internal/handlers/admin_claim_activation_impact_handler_test.go` - 200/403/404/422 handler tests
- `backend/internal/handlers/capability_policy_contract.go` - Added `ClaimActivationImpactPreview` DTO
- `backend/cmd/server/admin_routes.go` - Registered the new route
- `backend/cmd/server/main.go` - Wired `AdminClaimActivationImpactHandler` reusing existing `memberClaimsRepo`/`permissionSvc`
- `shared/contracts/admin-capabilities.yaml` - New path + `ClaimActivationImpactPreview` schema
- `frontend/src/types/admin-capability.ts` - New `ClaimActivationImpactPreview` TS interface
- `frontend/src/lib/api.ts` - New `getClaimActivationImpactPreview`
- `frontend/src/app/admin/claims/ClaimDecisionImpactPanel.tsx` - New per-decision impact panel (verify/activate/reject)
- `frontend/src/app/admin/claims/ClaimDecisionImpactPanel.test.tsx` - 4 behavior-case tests
- `frontend/src/app/admin/claims/ClaimsClient.tsx` - Wired the panel into the Aktion column, refreshing via `loadClaims` on `onDecided`

## Decisions Made

- Preview authorization deliberately reuses `ActionFansubGroupHistoricalMembersLink` (the same action `VerifyClaim`/`ActivateClaimedMember` already require) rather than inventing a new gate, so an admin who cannot perform the real decision cannot preview it either.
- `VerifyClaim`/`RejectClaim` never call the preview endpoint at all — the frontend renders the D-24-locked honest copy directly, since fabricating a diff for an action with none would violate the binding honesty rule.
- `ClaimDecisionImpactPanel` self-fetches `listRoleCapabilities()` for action labels rather than requiring a prop, since `ClaimsClient.tsx` (unlike `UserGroupRightsTab.tsx` for `RoleAssignmentImpactModal`) does not already hold a loaded capability matrix — mirrors the self-fetch precedent set by `RoleCapabilityImpactPreviewModal` (Plan 138-13).

## Deviations from Plan

None - plan executed exactly as written. One incidental fix: a pre-existing `gofmt` misalignment in `RoleAssignmentImpactPreview`'s struct tags inside `capability_policy_contract.go` (a file already touched by this plan's DTO addition) was corrected to keep the file `gofmt`-clean (Rule 1, trivial, same file).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

D-24 is closed: the Claims workspace previews a real rights diff only for `ActivateClaimedMember`, and never fabricates one for `VerifyClaim`/`RejectClaim`. Backend build/tests pass for all touched packages (`go build ./...`, targeted `-run 'ClaimActivation'` tests, and the broader `internal/permissions`+`internal/handlers` suites show zero regressions attributable to this plan — pre-existing unrelated failures documented in STATE.md persist unchanged). Frontend `ClaimDecisionImpactPanel` tests (4/4) and `tsc --noEmit` pass with no new errors (only the already-documented pre-existing Next.js route-type noise remains). No blockers for the remaining Phase 138 plans.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 6 created files verified present on disk; both task commits (`ca0c8dbe`, `59e0d40b`) verified present in `git log`.
