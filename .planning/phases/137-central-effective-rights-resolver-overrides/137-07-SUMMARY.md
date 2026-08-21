---
phase: 137-central-effective-rights-resolver-overrides
plan: 07
subsystem: api
tags: [go, gin, http, authorization, capability-overrides, tdd, openapi, bola-idor]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 02
    provides: "EffectiveRightState/EffectiveRightProvenance additively extended YAML/openapi/TS contract (D04), with the Go DTO extension explicitly deferred"
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 05
    provides: "permissions.ResolveGroupRights reachable from production HTTP traffic via AuthzRepository"
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 06
    provides: "services.EffectiveRightsService.MutateOverride -- the transactional SET ALLOW/SET DENY/REMOVE write path this handler delegates to"
provides:
  - "AdminEffectiveRightsHandler: GET .../effective-rights (inspection), PUT .../capability-overrides (mutation), GET .../capability-overrides/history (immutable history) -- all three group-scoped under /admin/fansubs/:id/app-members/:appUserId/"
  - "EffectiveRightState Go DTO (backend/internal/handlers/capability_policy_contract.go) additively extended to the full D04 shape already locked in the YAML/TS contract by 137-02, closing that plan's deferred gap"
  - "Three new OpenAPI path operations mirrored across shared/contracts/admin-capabilities.yaml and shared/contracts/openapi.yaml"
affects: [138]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Handler is a pure thin projection: GetEffectiveRights calls permissions.ResolveGroupRights exactly once and maps the returned Rights map field-for-field into []EffectiveRightState; no second decision path exists anywhere in this file."
    - "Narrow, handler-local interfaces (effectiveRightsPermissionService, effectiveRightsMutationService, effectiveRightsTargetRepo) decouple the handler from concrete *permissions.Service/*services.EffectiveRightsService/*repository.AuthzUserOverridesRepository types, mirroring the existing releaseReviewPermissionStub/releaseReviewQueryStub handler-test convention (release_review_handler_test.go)."
    - "D08 BOLA/IDOR: authorization always runs against the requested :id path group before any target lookup; a foreign/manipulated target resolves either a neutral 404 (inspection, via LockTargetMembership's ErrNotFound) or an empty list (history, since ListHistoryForSubject is inherently scoped by the exact pair) -- never a different status code that would function as an existence oracle."

key-files:
  created:
    - backend/internal/handlers/admin_effective_rights_handler.go
    - backend/internal/handlers/admin_effective_rights_handler_test.go
  modified:
    - backend/internal/handlers/capability_policy_contract.go
    - backend/internal/handlers/phase136_contract_parity_test.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-capabilities.yaml
    - shared/contracts/openapi.yaml

key-decisions:
  - "All three endpoints (inspection, mutation, history) are authorized through the same permissions.ActionUserGroupCapabilityOverrideManage capability (D07's dedicated management capability) rather than inventing a separate 'inspect only' action -- no such action exists in the migration-0150 catalog, and whoever may manage overrides in a group can certainly inspect them."
  - "CapabilityOverrideState instances embedded in CapabilityOverrideMutationResult.Before/After and CapabilityOverrideAuditItem.Before/After attribute both sides' created_by_user_id/created_at/reason to the single transition event that produced the result. The schema (locked since Phase 136) requires a full CapabilityOverrideState (with its own reason/created_by/created_at) on both sides, but the actual persistence layer (AuthzUserOverridesRepository/EffectiveRightsService) only ever returns bare before/after effect strings -- per-row historical provenance for a PRIOR state is not separately tracked anywhere. Using the transition's own actor/reason/timestamp for both sides is the only data-available, non-fabricated representation; documented inline in capabilityOverrideStateFromMutationSide's doc comment."
  - "Mutation body carries group_id/target_user_id/action_code per the already-locked CapabilityOverrideMutationRequest DTO; the handler cross-checks body.GroupID/body.TargetUserID against the :id/:appUserId path parameters and rejects a mismatch with 422 before calling MutateOverride, per D08 and the plan's explicit must_have. action_code stays body-only (not duplicated in the path) since CapabilityOverrideMutationRequest already carries it and the path's job is purely to be the authorization-bearing group/target scope."
  - "A single PUT endpoint expresses all three D06 logical operations (SET ALLOW/SET DENY/REMOVE) via effect=allow|deny|null, reusing CapabilityOverrideMutationRequest's existing nullable effect field rather than three separate routes -- the DTO's own shape already encodes exactly this design."

requirements-completed: [CAP-01, CAP-02, CAP-05, CAP-06, CAP-07, QUAL-03]

# Metrics
duration: ~45min
completed: 2026-08-21
---

# Phase 137 Plan 07: Effective-Rights Inspection, Mutation and History API Summary

**New `AdminEffectiveRightsHandler` exposes group-scoped GET .../effective-rights, PUT .../capability-overrides, and GET .../capability-overrides/history as thin HTTP projections of the existing central resolver and mutation service -- zero duplicated permission logic, with negative BOLA/IDOR coverage proving cross-group and foreign-target requests are rejected or neutrally empty.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-21 (following 137-06)
- **Completed:** 2026-08-21
- **Tasks:** 2 completed
- **Files modified:** 7 (2 new handler files, 5 modified: 2 Go contract/test files, 2 routing files, 2 shared OpenAPI contracts -- one file, capability_policy_contract.go, counted once)

## Accomplishments

- `GET /api/v1/admin/fansubs/:id/app-members/:appUserId/effective-rights` returns the complete relevant capability list for the target member in exactly one `ResolveGroupRights` call, projected field-for-field into `[]EffectiveRightState` (action_code, allowed, granting_roles, user_allow, user_deny, specialized_grants, decisive_source, reason_code, provenance, decisive, non_deniable). Dormant overrides (D02) and denied capabilities remain visible per D04's example shape.
- `PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/capability-overrides` accepts the existing Phase-136 `CapabilityOverrideMutationRequest` (`effect: allow|deny|null`), cross-checks `group_id`/`target_user_id` against the path before any domain mutation, maps to `services.OverrideMutationKind` (SET ALLOW/SET DENY/REMOVE), delegates entirely to `EffectiveRightsService.MutateOverride`, and returns `CapabilityOverrideMutationResult` including a freshly re-resolved `effective_right` for the mutated action.
- `GET /api/v1/admin/fansubs/:id/app-members/:appUserId/capability-overrides/history` lists immutable transition records strictly scoped to `(target_user_id, fansub_group_id)`.
- A caller authorized only for group A is rejected (403) before any target lookup for group B, on all three endpoints -- proven by `target.lockCalls`/`target.historyCalls` staying at zero in the cross-group tests.
- A manipulated/foreign target (no membership row for the exact group) resolves neutrally: inspection returns 404 without disclosing whether the target exists elsewhere; history returns an empty list (not a different status code) since its query is inherently scoped.
- Unknown/non-overridable actions, an inactive target membership, and a missing reason for a real change all map to `422` via `services.Err*` sentinel errors, consistent with the codebase's existing 4xx conventions (e.g. `role_not_capability_bearing`).
- Closed 137-02's explicitly deferred gap: the Go `EffectiveRightState` DTO in `capability_policy_contract.go` now carries the full D04 shape (`granting_roles`, `user_allow`, `user_deny`, `specialized_grants`, `decisive_source`, `reason_code`), matching the YAML/TS contract 137-02 already locked. Without this, the plan's own must_have ("Response includes full additive provenance fields") could not be satisfied by any Go handler.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock the group-scoped HTTP contract and BOLA/IDOR behavior in handler tests** - `2afefb68` (test) - RED confirmed: `go vet ./internal/handlers` fails with `undefined: AdminEffectiveRightsHandler` / `undefined: NewAdminEffectiveRightsHandler` before the handler existed.
2. **Task 2: Implement inspection, mutation and history handlers/routes** - `aed884e8` (feat) - GREEN confirmed: `go test ./internal/handlers -run 'EffectiveRights|Override|BOLA|IDOR' -count=1` passes all 18 new/relevant tests; `go build ./...`/`go vet ./...` clean; `git diff --check` clean.

_Note: This is a `tdd="true"` plan executed with a strict RED -> GREEN cycle per task._

## Files Created/Modified

- `backend/internal/handlers/admin_effective_rights_handler.go` - New: `AdminEffectiveRightsHandler` with `GetEffectiveRights`/`MutateOverride`/`ListOverrideHistory`, three narrow handler-local interfaces, and pure projection helpers (`effectiveRightStateFromCapabilityState`, `capabilityOverrideStateFromMutationSide`, `capabilityOverrideAuditItemFromHistoryEntry`).
- `backend/internal/handlers/admin_effective_rights_handler_test.go` - New: contract/BOLA/IDOR test suite with fake permission/mutation/target-repo doubles (mirrors `release_review_handler_test.go`'s convention), reusing the package's existing `stubCapabilityAuthzRepo`/`captureAuditLogRepo`.
- `backend/internal/handlers/capability_policy_contract.go` - Additively extended `EffectiveRightState` and `EffectiveRightProvenance` to the full D04 shape (deviation, see below).
- `backend/internal/handlers/phase136_contract_parity_test.go` - Updated the locked `EffectiveRightState{}` JSON-shape and enum-vocabulary expectations to match the additive extension.
- `backend/cmd/server/admin_routes.go` - New `adminEffectiveRightsHandler` field and three new routes under `/admin/fansubs/:id/app-members/:appUserId/`.
- `backend/cmd/server/main.go` - Constructs `AuthzUserOverridesRepository`, `EffectiveRightsService`, and `AdminEffectiveRightsHandler`, wired into `registerAdminRoutes`.
- `shared/contracts/admin-capabilities.yaml` / `shared/contracts/openapi.yaml` - Three new path operations each (`getEffectiveRights`, `mutateEffectiveRightsOverride`, `listEffectiveRightsOverrideHistory`), referencing the already-locked `EffectiveRightState`/`CapabilityOverrideMutationRequest`/`CapabilityOverrideMutationResult`/`CapabilityOverrideAuditItem` schemas.

## Decisions Made

See `key-decisions` in the frontmatter for full rationale on: the single shared authorization capability across all three endpoints, the CapabilityOverrideState before/after provenance-attribution decision, the body-vs-path cross-check, and the single-PUT-endpoint design for all three D06 mutation kinds.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `backend/internal/router/router.go` does not exist in this codebase**
- **Found during:** Task 2 planning (grep for the plan's declared file)
- **Issue:** The plan's `files_modified` lists `backend/internal/router/router.go`, but this codebase registers all HTTP routes in `backend/cmd/server/admin_routes.go` (admin routes) and `backend/cmd/server/main.go` (top-level `v1` group), confirmed by every prior Phase-137-adjacent plan (`fansub_hist_group_member_roles_handler.go`'s routes, `AdminCapabilityHandler`'s routes) living there, not in an `internal/router` package.
- **Fix:** Wired the three new routes into `backend/cmd/server/admin_routes.go`'s `registerAdminRoutes` (new `adminEffectiveRightsHandler` field + guarded route block, matching the existing `if deps.releaseReviewHandler != nil` precedent) and constructed the handler's dependencies in `backend/cmd/server/main.go`.
- **Files modified:** `backend/cmd/server/admin_routes.go`, `backend/cmd/server/main.go` (in place of the non-existent `backend/internal/router/router.go`).
- **Verification:** `go build ./...` clean; routes reachable via `registerAdminRoutes`'s existing test coverage pattern is not itself unit-tested (no `router_test.go` precedent in this codebase), but the handler methods themselves are fully covered by `admin_effective_rights_handler_test.go`.
- **Committed in:** `aed884e8` (Task 2)

**2. [Rule 2 - Missing critical functionality, pre-authorized by the known-deferred-item instruction] Closed 137-02's deferred Go `EffectiveRightState` DTO gap**
- **Found during:** Task 1 design (per this plan's explicit "known deferred item" instruction)
- **Issue:** 137-02-SUMMARY.md flagged that `backend/internal/handlers/capability_policy_contract.go`'s `EffectiveRightState` Go struct still had the old 5-field/4-value shape at the time 137-02 finished, and explicitly deferred extending it to "the later plan implementing ResolveGroupRights" / the HTTP projection. This plan (137-07) is exactly that plan: it is the first to serialize `EffectiveRightState` over HTTP for inspection, and its own must_have ("Response includes full additive provenance fields") is impossible to satisfy without the Go struct carrying `granting_roles`/`user_allow`/`user_deny`/`specialized_grants`/`decisive_source`/`reason_code`.
- **Fix:** Additively extended `EffectiveRightState` and `EffectiveRightProvenance` in `capability_policy_contract.go` to the exact shape already locked in `shared/contracts/admin-capabilities.yaml`/`openapi.yaml`/`admin-capability.ts` by 137-02. Updated the one locked Go-side test that hardcoded the pre-extension shape (`phase136_contract_parity_test.go`'s `TestPhase136ContractParity/Go_DTO_JSON_shapes` and `/shared_enum_vocabulary` subtests), mirroring 137-02's own precedent of updating a lock test in the same commit as its own required additive change.
- **Files modified:** `backend/internal/handlers/capability_policy_contract.go`, `backend/internal/handlers/phase136_contract_parity_test.go`.
- **Verification:** `go test ./internal/handlers -run 'TestPhase136ContractParity'` passes all 6 subtests (including `Go_DTO_JSON_shapes` and `shared_enum_vocabulary`); `go test ./internal/handlers -run 'Phase136|Capability.*Contract|EffectiveRight'` passes with zero regressions.
- **Committed in:** `2afefb68` (Task 1, since it is a contract-locking change needed for the test file itself to be meaningful).

---

**Total deviations:** 1 auto-fixed blocking-issue substitution (Rule 3, non-existent declared file) + 1 pre-authorized gap closure (Rule 2, explicitly anticipated by this plan's own prompt instructions).
**Impact on plan:** Both were necessary for the plan's own must_haves to be achievable at all; no unrelated scope creep.

## Known Stubs

None -- this plan is pure backend HTTP handler/routing/contract code with full test coverage; no partial UI or mock data wiring. Per the plan's own explicit constraint, no Phase-138 UI was implemented.

## Threat Flags

None new beyond what the plan's own `<threat_model>` anticipated (cross-group inspection, cross-group mutation, enumeration via foreign IDs) -- all three are exactly what this plan's tests (`TestGetEffectiveRightsRejectsActorNotAuthorizedForTargetGroup`, `TestGetEffectiveRightsForeignTargetIsNeutralNotFound`, `TestMutateOverrideRejectsBodyPathMismatchBeforeDomainMutation`, `TestListOverrideHistoryForeignPairReturnsEmptyNotError`) directly cover.

## Issues Encountered

`go test ./internal/handlers` (full package, unscoped) surfaces the same pre-existing, documented `permissions.loadedCache` nil-cache gap 137-06-SUMMARY.md and `deferred-items.md` already flagged (~20 tests across ~10 files that construct `permissions.NewService(...)` without ever calling `LoadCache`). Verified not caused by this plan: `git diff --stat` shows zero changes to any of the affected files (`admin_content_anime_theme_segment_assignments_test.go`, `admin_content_anime_theme_segment_range_autoassign_test.go`, `admin_content_fansub_releases_contributions_handlers_test.go`, `admin_content_fansub_releases_test.go`, `admin_content_release_version_media_test.go`, `app_auth_test.go`), and the failures reproduce identically regardless of this plan's changes. `TestPhase128PublicMemberAccessMatrix` is a separate, unrelated pre-existing source-inspection-string-match failure (Phase 128, naming-convention drift), also untouched by this plan. Not fixed; out of scope per SCOPE BOUNDARY.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 137-08 (final cross-layer validation) can build directly on this plan's handler as the HTTP boundary proof: `AdminEffectiveRightsHandler` is the concrete implementation that closes CAP-01/02/05/06/07 and QUAL-03 at the API layer, with `ResolveGroupRights`/`MutateOverride` as its sole decision/write paths.
- Phase 138 (the admin UI) can consume `GET .../effective-rights`, `PUT .../capability-overrides`, and `GET .../capability-overrides/history` directly against the now-locked `EffectiveRightState`/`CapabilityOverrideMutationRequest`/`CapabilityOverrideMutationResult`/`CapabilityOverrideAuditItem` DTOs -- no further contract work is needed for the inspection/mutation/history surface itself.
- The pre-existing `internal/handlers` nil-permissions-cache test-ordering gap (documented in `deferred-items.md`) remains open and unrelated to this plan; still recommended as a follow-up `TestMain`-based fix before adding further role-grant-dependent handler tests to affected files.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 07*
*Completed: 2026-08-21*

## Self-Check: PASSED

All 9 created/modified files verified present on disk; all 3 commit hashes
(`2afefb68`, `aed884e8`, `ae43b162`) verified present in `git log`.
