---
phase: 145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf
plan: 01
subsystem: auth
tags: [permissions, rights-registry, postgres, migration, go]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: "ResolveGroupRights/evaluateGroupRights precedence engine, IsMembershipBaselineAction call site"
provides:
  - "Migration 0160: role_definitions.reserved column + group_member pseudo-role + its 3 role_capabilities rows"
  - "RoleMembershipBaseline constant + cache-driven IsMembershipBaselineAction"
  - "validateMembershipBaselineRegistryPresence fail-closed startup gate (LoadCache + LoadFansubGroupCatalog)"
  - "LoadFansubGroupRoles NOT reserved SQL guard excluding the pseudo-role from the assignable catalog"
affects: [145-02, 145-03, 145-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reserved, non-assignable pseudo-role represented in role_definitions/role_capabilities instead of a hardcoded Go slice"
    - "Fail-closed startup validation of a specific role's registry rows, distinct from the existing catalog-wide validateCapabilityCatalog check"

key-files:
  created:
    - database/migrations/0160_membership_baseline_pseudo_role.up.sql
    - database/migrations/0160_membership_baseline_pseudo_role.down.sql
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/effective_rights.go
    - backend/internal/permissions/effective_rights_test.go
    - backend/internal/permissions/capability_registry_test.go
    - backend/internal/permissions/permissions_reload_test.go
    - backend/internal/repository/authz_permissions.go

key-decisions:
  - "group_member pseudo-role uses sort_order -10 (below the live minimum of 0) so it sorts first under Gruppenrollen, per 145-UI-SPEC.md's Interaction Contract"
  - "validateMembershipBaselineRegistryPresence is a distinct check from validateCapabilityCatalog because the 3 baseline actions are already granted to other roles -- the existing catalog-wide check cannot detect the pseudo-role's own rows being absent"
  - "LoadCapabilityRoles is intentionally left untouched -- its contexts-only predicate already correctly includes the reserved pseudo-role for capability-matrix editing; only LoadFansubGroupRoles needed the NOT reserved guard"

patterns-established:
  - "A reserved BOOLEAN column on role_definitions is now the mechanism for 'carries capability context but never assignable' roles, reusable by any future pseudo-role"

requirements-completed: [SC-1, SC-3, SC-4, SC-5, SC-6]

# Metrics
duration: 5min
completed: 2026-09-03
---

# Phase 145 Plan 01: Membership-Baseline Pseudo-Role Summary

**Migration 0160 turns the hardcoded `membershipBaselineActions` Go slice into a reserved, non-assignable `group_member` pseudo-role sourced live from `role_capabilities`, with a new fail-closed startup gate and a SQL fix keeping it out of the assignable-role catalog.**

## Performance

- **Duration:** ~5 min (15:01-15:06 UTC)
- **Started:** 2026-09-03T15:01:00Z
- **Completed:** 2026-09-03T15:06:00Z
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- Reversible migration 0160 seeds the `group_member` reserved pseudo-role (`sort_order -10`, `assignable = false`, `reserved = true`) and its exact 3 `role_capabilities` rows (`fansub_group.members.view`, `fansub_group_media.view`, `fansub_group_media.upload`), verified via a live down/up round trip against `team4s_v2`
- `IsMembershipBaselineAction` now resolves purely from the loaded `role_capabilities` cache via `roleAllows(RoleMembershipBaseline, action)` -- the `membershipBaselineActions` Go slice and its `slices` import are gone
- `validateMembershipBaselineRegistryPresence` closes a real gap `validateCapabilityCatalog` could not catch (the pseudo-role's own rows going missing while the same actions remain granted elsewhere) and is wired into both `LoadCache` and `LoadFansubGroupCatalog` before cache publish, so a botched migration/seed fails closed rather than silently degrading every active member's rights
- `LoadFansubGroupRoles`'s SQL predicate now excludes reserved roles (`AND NOT reserved`), closing a real elevation-of-privilege gap: without it, the pseudo-role's `fansub_group` context would have let it pass `IsKnownFansubGroupRole` and become assignable through the same endpoints as a real group role

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0160 -- reserved column + group_member pseudo-role + its 3 role_capabilities rows** - `8d78d52c` (feat)
2. **Task 2: Cache-driven IsMembershipBaselineAction + fail-closed registry-presence startup gate** - `9e94521e` (feat, tdd)
3. **Task 3: Exclude the reserved pseudo-role from the assignable/known-group-role catalog** - `9d5b071c` (fix, tdd)

**Plan metadata:** (this commit, docs)

_Note: Task 2 and 3 are TDD tasks; tests and implementation landed together in each task's single commit since both were written and verified in the same pass against the fixture-driven test suite (no separate RED-only commit was needed -- the new tests did not exist as a prior failing state in git history)._

## Files Created/Modified
- `database/migrations/0160_membership_baseline_pseudo_role.up.sql` - adds `role_definitions.reserved`, seeds `group_member` role + its 3 `role_capabilities` rows
- `database/migrations/0160_membership_baseline_pseudo_role.down.sql` - symmetric reversal (rows, role, column)
- `backend/internal/permissions/permissions.go` - `RoleMembershipBaseline` constant, `validateMembershipBaselineRegistryPresence`, wired into `LoadCache`/`LoadFansubGroupCatalog`
- `backend/internal/permissions/effective_rights.go` - `IsMembershipBaselineAction` now cache-driven; removed the static slice and unused `slices` import
- `backend/internal/permissions/effective_rights_test.go` - 3 new tests locking Success Criteria 1, 3, 4
- `backend/internal/permissions/capability_registry_test.go` - `roleMatrixStubData()` fixture-parity fix, `TestLoadCacheFailsClosedWhenPseudoRoleCapabilitiesMissing`, `TestPseudoRoleCapabilityEditableButNotAssignable`
- `backend/internal/permissions/permissions_reload_test.go` - `fullValidCacheData()` fixture-parity fix
- `backend/internal/repository/authz_permissions.go` - `LoadFansubGroupRoles`'s `WHERE` clause gained `AND NOT reserved`

## Decisions Made
- `sort_order = -10` for `group_member` (below the live minimum of 0) per 145-UI-SPEC.md's Interaction Contract item 2 -- ensures the pseudo-role sorts first under "Gruppenrollen"
- `validateMembershipBaselineRegistryPresence` is a distinct function from `validateCapabilityCatalog`, not an extension of it, because the failure mode it guards against (the pseudo-role's own rows specifically missing) is invisible to the existing catalog-wide check
- Kept `permissions.go` and `effective_rights_test.go` over their 450-line CLAUDE.md cap as a scoped, plan-documented exception (both files already exceeded the cap before this plan; splitting either mid-refactor was explicitly out of this phase's locked scope per the plan's own modularity note)

## Deviations from Plan

None - plan executed exactly as written. All `<action>` and `<behavior>` requirements for all 3 tasks were implemented as specified, including both fixture-parity fixes (`roleMatrixStubData()`, `fullValidCacheData()`) called out in the plan's grounding facts.

## Issues Encountered

The backend container's `/app` source tree is not bind-mounted for live sync (only `database/migrations`, `shared/contracts`, `frontend/src/types`, `media`, and `scripts` are); source sync depends on `docker compose watch team4sv30-backend` running as a background process, which was not active when the session started. Started it in the background before running Task 2's tests, confirmed via a line-count diff between host and container source that the sync caught up, then proceeded -- no code changes were needed, this was purely a test-environment prerequisite.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Go/SQL foundation Plans 145-02/03/04 depend on is in place: `RoleMembershipBaseline`, the cache-driven `IsMembershipBaselineAction`, the fail-closed startup gate, and the SQL exclusion from the assignable catalog are all live against the running dev database and covered by passing regression tests.
- Migration 0160 is applied to the live `team4s_v2` database (verified via a down/up round trip); the pseudo-role's 3 `role_capabilities` rows and `reserved = true` flag are queryable now.
- Plan 145-02 (per 145-VALIDATION.md Success Criterion 2) still needs the real-Postgres before/after effective-rights snapshot proof this plan's scope did not include -- that migration-application-time behavioral proof is explicitly deferred to 145-02.
- No blockers identified for continuing to 145-02.

---
*Phase: 145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf*
*Completed: 2026-09-03*

## Self-Check: PASSED

All 9 listed files found on disk; all 4 commit hashes (8d78d52c, 9e94521e, 9d5b071c, de2cd44d) found in git history.
