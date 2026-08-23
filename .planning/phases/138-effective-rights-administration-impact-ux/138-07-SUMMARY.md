---
phase: 138-effective-rights-administration-impact-ux
plan: 07
subsystem: api
tags: [go, gin, permissions, effective-rights, capability-matrix, precedence-engine]

# Dependency graph
requires:
  - phase: 138-01
    provides: "AuthzRepository.ListRoleHolders(roleCode) -- real fansub-group-scoped role holder enumeration"
  - phase: 138-04
    provides: "loadGroupRightsSources extraction and the role-assignment preview precedent for reusing evaluateGroupRights without a second decision engine"
provides:
  - "Service.PreviewGroupRightsCapabilityChange -- batch before/after effective-rights diff for one action across every real role holder"
  - "evaluateGroupRightsWithHypotheticalGrant -- thin, provably-equivalent variant of evaluateGroupRights for a single hypothetical (role, action) grant/revoke"
  - "GET /admin/role-capabilities/:roleCode/:actionCode/impact-preview -- platform-admin-gated batch impact preview endpoint"
affects: [138-08, 138-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batch preview evaluator: reuse loadGroupRightsSources + evaluateGroupRights per (appUserID, fansubGroupID) pair rather than a per-holder repeated resolver call chain"
    - "Hypothetical-grant precedence duplication scoped to exactly one action, documented in-code as provably equivalent to the real precedence switch (D-20)"

key-files:
  created:
    - backend/internal/permissions/effective_rights_capability_impact_preview.go
    - backend/internal/permissions/effective_rights_capability_impact_preview_test.go
    - backend/internal/handlers/admin_capability_impact_handler.go
    - backend/internal/handlers/admin_capability_impact_handler_test.go
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go

key-decisions:
  - "evaluateGroupRightsWithHypotheticalGrant delegates every action except the hypothetical one to the real, unmodified evaluateGroupRights, and only duplicates the short precedence switch for the single hypothetical action (documented equivalence, not a second engine)"
  - "Each holder's Actor is intentionally minimal (AppUserID only) -- status/platform-admin flags are not re-resolved per holder for preview performance, documented as an accepted preview-only simplification since the real mutation/enforcement path is unaffected"
  - "A nil Service/resolver returns an error (not a denied-result shape) since this batch preview has no single actor to build a denial around"

requirements-completed: [CAP-09]

# Metrics
duration: 40min
completed: 2026-08-23
---

# Phase 138 Plan 07: Role-to-Capability Change Impact Preview Summary

**Batch before/after effective-rights preview for every real role holder ahead of Grant/RevokeCapability, reusing the same precedence engine with zero second decision path (CAP-09, D-20)**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-08-23T17:46:08Z
- **Tasks:** 2 completed
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments
- `permissions.Service.PreviewGroupRightsCapabilityChange` batch-computes a before/after diff for one action across every `RoleHolderTarget` (app user, fansub group) pair, reusing `loadGroupRightsSources`/`evaluateGroupRights` exactly (D-20 binding)
- `evaluateGroupRightsWithHypotheticalGrant` forces one (role, action) pair's granting-role determination to a hypothetical grant/revoke value without ever touching the package-level `loadedCache` (T-138-16)
- New `AdminCapabilityImpactHandler.PreviewCapabilityChange` at `GET /admin/role-capabilities/:roleCode/:actionCode/impact-preview?add=true|false`, gated by the exact same platform-admin identity check and `role_not_capability_bearing` 422 guard as `GrantCapability`/`RevokeCapability` (T-138-14)
- 5 pure-Go fixture-driven tests in the permissions package and 5 handler tests prove the gained/retained-via-second-role/user-deny-wins/multi-holder-independence/misconfiguration and 200/422/400/403 cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Batch preview evaluator (permissions package)** - `90bad159` (feat)
2. **Task 2: Handler, route, wiring** - `b00603bf` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/permissions/effective_rights_capability_impact_preview.go` - `PreviewGroupRightsCapabilityChange`, `evaluateGroupRightsWithHypotheticalGrant`, `RoleHolderTarget`/`CapabilityImpactResult` types
- `backend/internal/permissions/effective_rights_capability_impact_preview_test.go` - 5 fixture-driven tests (no Postgres)
- `backend/internal/handlers/admin_capability_impact_handler.go` - `AdminCapabilityImpactHandler.PreviewCapabilityChange` HTTP boundary
- `backend/internal/handlers/admin_capability_impact_handler_test.go` - 5 handler tests (200/422/400x2/403)
- `backend/cmd/server/admin_routes.go` - new route registration + `adminRouteHandlers` field
- `backend/cmd/server/main.go` - `NewAdminCapabilityImpactHandler` construction, reusing `authzRepo`/`permissionSvc`

## Decisions Made
- `evaluateGroupRightsWithHypotheticalGrant` calls the real `evaluateGroupRights` for every action except the one hypothetical action, and only duplicates the (short, 8-branch) precedence switch for that single action, with an in-code comment cross-referencing `effective_rights.go`'s switch as the equivalence proof — this matches the plan's explicit interfaces-block guidance ("reuse as much of the real precedence switch as possible... document this equivalence in a code comment") rather than attempting a zero-duplication refactor of `effective_rights.go` itself, which the plan's own `files_modified` list did not include.
- Each holder's `Actor` in the batch preview is built as `Actor{AppUserID: holder.AppUserID}` only (no per-holder status/platform-admin lookup), per the plan's explicit instruction to avoid an N+1 identity-resolution loop; documented in-code that a platform-admin or disabled holder will display as a regular member in this PREVIEW ONLY, with zero effect on the real enforcement path.
- `PreviewGroupRightsCapabilityChange` returns a plain error (`errCapabilityImpactPreviewServiceUnavailable`) rather than a denied-result shape when `Service`/resolver is nil, since there is no single actor to build a `denyAllGroupRights`-style result around for a batch call.

## Deviations from Plan

None - plan executed exactly as written (interfaces block's suggested type/function names, route shape, and handler flow order were followed literally; both plan-specified files-modified lists were extended by zero unplanned files).

## Issues Encountered
- Running the full `internal/handlers` package test suite (broader than this plan's own `-run TestAdminCapabilityImpactHandler` scope) surfaces ~20 pre-existing, unrelated failures rooted in `testmain_test.go`'s `handlerTestCatalogLoader` not implementing `permissions.CacheLoader` (nil `loadedCache` for the whole package run), plus two further unrelated pre-existing failures (`TestPhase128PublicMemberAccessMatrix`, `TestReleaseVersionMedia_CapabilitiesExposeOwnDelete`). This exact nil-cache pattern is already documented project-wide in `.planning/STATE.md`'s Blockers/Concerns section as pre-existing and not caused by Phase 137/138 work. Confirmed none of this plan's own touched files are implicated; logged to `deferred-items.md` per the scope-boundary rule and left untouched. This plan's own scoped test run (`-run TestAdminCapabilityImpactHandler`) and the full `internal/permissions/...` suite are both 100% green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CAP-09's backend engine (batch role-to-capability impact preview) is fully live and platform-admin-gated, ready for a later Phase-138 plan to wire a frontend Impact Preview modal in front of the existing Grant/RevokeCapability admin UI.
- No blockers for subsequent plans.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 4 created files and both task commit hashes (`90bad159`, `b00603bf`) verified present.
