---
phase: 137-central-effective-rights-resolver-overrides
plan: 06
subsystem: auth
tags: [go, postgres, authorization, capability-overrides, tdd, transactions]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 01
    provides: Migration 0150 (management capability + ten-action pilot user_overridable=true set)
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 03
    provides: AuthzUserOverridesRepository batch-load/lock/mutate/history primitives
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 04
    provides: permissions.GroupRightsResolution/ResolveGroupRights D01 precedence engine
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 05
    provides: AuthzRepository wired into GroupRightsMembershipResolver/GroupRightsOverridesResolver (real production membership/override reads)
provides:
  - "EffectiveRightsService.MutateOverride -- the single transactional D06/D07/D08 write path for one per-user group-scoped capability override"
  - "permissions.ActionUserGroupCapabilityOverrideManage -- the D07 dedicated management-capability Action constant (was previously undeclared, see Deviations)"
affects: [137-07, 137-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EffectiveRightsService.MutateOverride mirrors ReviewService.changeDelegation's Begin -> defer Rollback -> authorize -> validate -> lock -> compare -> mutate -> append history -> Commit shape, using CanForFansubGroup/ResolveGroupRights for authorization instead of a bespoke check."
    - "Injectable effectiveRightsOverrideRepo interface + unexported testBarrier/newOverrideRepo service fields let this package's own tests force a history-insert failure (rollback proof) and deterministically observe real Postgres row-lock serialization (concurrency proof) without any production-facing API surface."

key-files:
  created:
    - backend/internal/services/effective_rights_service.go
    - backend/internal/services/effective_rights_service_test.go
    - backend/internal/services/effective_rights_concurrency_test.go
    - .planning/phases/137-central-effective-rights-resolver-overrides/deferred-items.md
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/capability_registry_test.go
    - backend/internal/permissions/permissions_reload_test.go
    - backend/internal/handlers/app_auth_test.go

key-decisions:
  - "D06's reason requirement is enforced uniformly for every actor (including platform admins), even though migration 0146's own CHECK constraint (chk_user_group_capability_override_history_reason_required) only requires it for non-platform-admin actors. Chosen as the stricter, simpler rule matching the plan's must_haves literally (\"a real change requires ... a reason\", no stated exception) rather than exploiting the DB's laxity."
  - "Membership validation (D02/D08) runs for every mutation Kind, including REMOVE -- a real change always requires an active target membership in the exact target group, matching the plan's must_haves literally rather than exempting REMOVE as a 'cleanup' operation on a dormant override."
  - "A genuinely missing target membership and an existing-but-inactive one both map to the same ErrEffectiveRightsTargetNotActiveMember, and a foreign-group target simply never resolves a row for the exact (target, requested group) pair -- one neutral error covers all three per D08's 'prefer neutral not_found behavior' guidance, disclosing nothing about which case occurred."
  - "The D06 concurrency proof uses real Postgres pessimistic row locking (LockTargetMembership's SELECT ... FOR UPDATE, UpsertOverride/DeleteOverride's own SELECT ... FOR UPDATE), not the release-review concurrency test's optimistic revision-CAS pattern -- both conflicting mutations always succeed (no loser), but the second-serialized transaction must observe the first transaction's actually-committed state, never the stale value both callers originally read. Proven via a service-local testBarrier hook that only the transaction winning the real row lock ever reaches, rather than an artificial two-sided rendezvous."

patterns-established:
  - "New Phase-137 service-layer code lives in a dedicated new services/effective_rights_service.go file, matching 137-04's precedent of new dedicated files over growing an existing near-cap file."

requirements-completed: [CAP-05, CAP-06, CAP-07, QUAL-03]

# Metrics
duration: ~35min
completed: 2026-08-21
---

# Phase 137 Plan 06: Transactional Per-User Override Mutation Service Summary

**New `EffectiveRightsService.MutateOverride` is the single atomic SET ALLOW / SET DENY / REMOVE write path for per-user capability overrides -- authorized through the new `user_group_capability_override.manage` capability via `ResolveGroupRights`, idempotent on exact repeats, and proven against real Postgres for rollback-on-history-failure and genuine concurrent-mutation serialization.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-21 (following 137-05)
- **Completed:** 2026-08-21T19:01:43Z
- **Tasks:** 2 completed
- **Files modified:** 7 (3 new service files, 1 new deferred-items.md, 3 modified permissions/handlers files)

## Accomplishments

- `backend/internal/services/effective_rights_service.go` implements `EffectiveRightsService.MutateOverride`, the transactional D06 write path: `Begin -> defer Rollback -> authorize (CanForFansubGroup against the new management capability) -> lock+validate active target membership (D02/D08) -> validate catalog/user_overridable (D07) -> lock/mutate the override row -> append immutable history only for a real change -> Commit`. Exact repeats (`allow->allow`, `deny->deny`, `none->none`) are true no-ops: no history row, no reason required, still `activation_status=active`.
- Every real transition in D06's list (`none->allow`, `none->deny`, `allow->deny`, `deny->allow`, `allow->none`, `deny->none`) creates exactly one immutable history row with the real committed before/after state.
- A history-insert failure (forced via an injectable test wrapper) rolls back the override mutation in the same transaction -- proven by asserting the DB row is absent afterward, not merely that the call returned an error.
- A real Postgres concurrency test proves D06's own worked example (`Admin A: allow->deny`, `Admin B: allow->remove`) serializes via row locking to a consistent state: both mutations succeed, the second-serialized one observes the first's actually-committed value (not the stale value both admins originally read), and the two immutable history rows chain `before`/`after` correctly.
- D07 authorization is via a brand-new `permissions.ActionUserGroupCapabilityOverrideManage` capability resolved per-target-group through the existing central `ResolveGroupRights`/`CanForFansubGroup` path -- no hard-coded role names, platform-admin flows through the existing non-deniable bypass, self-mutation is allowed only because the actor happens to hold the capability (no special-casing), and the capability never crosses group boundaries (proven negatively).
- D08 scoping: a manipulated/foreign target or group ID simply never resolves an active membership row for that exact pair, returning the same neutral `ErrEffectiveRightsTargetNotActiveMember` as a genuinely missing or inactive membership -- no information about which case occurred is disclosed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify mutation, no-op, rollback and dormant-membership behavior** - `f0b1fa34` (test) - RED confirmed: `go build`/`go vet` fail with `undefined: EffectiveRightsService` / `EffectiveRightsOverrideMutationCommand` / etc. before the service file existed (verified by temporarily removing the not-yet-committed implementation file and re-running `go vet ./internal/services/...`).
2. **Task 2: Implement transactional EffectiveRightsService mutation** - `ed6e14f3` (feat) - GREEN confirmed: `go test ./internal/services -run 'EffectiveRights|Override.*Concurrency' -count=1` passes (17 test functions/subtests); `go build ./...`/`go vet ./...` clean; `git diff --check` clean; `go test ./internal/permissions/...` green.

**Plan metadata:** (this commit, once created)

_Note: This is a `tdd="true"` plan executed with a strict RED -> GREEN cycle per task; the test files were written and confirmed to fail to compile before the implementation was added._

## Files Created/Modified

- `backend/internal/services/effective_rights_service.go` - `EffectiveRightsService.MutateOverride`, `OverrideMutationKind`, `EffectiveRightsOverrideMutationCommand`/`Result`, the D06 reason-validation helper, and the injectable `effectiveRightsOverrideRepo` seam.
- `backend/internal/services/effective_rights_service_test.go` - Real-Postgres integration tests: the full transition/no-op matrix, reason requirement, membership validation, authorization (including cross-group and self-mutation), catalog validation, and the history-rollback proof; plus the fixture harness and a local `permissions.LoadCache` stub (see Deviations).
- `backend/internal/services/effective_rights_concurrency_test.go` - The D06 concurrent-conflicting-mutation proof against real Postgres row locking.
- `backend/internal/permissions/permissions.go` - New `ActionUserGroupCapabilityOverrideManage` constant, added to `allKnownActions`.
- `backend/internal/permissions/capability_registry_test.go`, `backend/internal/permissions/permissions_reload_test.go` - D-10 catalog-consistency stub fixtures updated to include the new action.
- `backend/internal/handlers/app_auth_test.go` - `appAuthCapabilityCacheLoader`'s complete action list updated to include the new action (the one genuinely new D-10 fallout in that package; see Deviations).
- `.planning/phases/137-central-effective-rights-resolver-overrides/deferred-items.md` - New; documents an unrelated, pre-existing `internal/handlers` test-infrastructure gap discovered (but not fixed) while diagnosing D-10 fallout.

## Decisions Made

See `key-decisions` in the frontmatter for the full rationale on: the uniform (no platform-admin exemption) reason requirement, unconditional membership validation across all three mutation kinds, the single neutral BOLA-safe error for missing/inactive/foreign-group targets, and the pessimistic-locking concurrency proof design.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `permissions.allKnownActions` was missing the D07 management capability entirely**
- **Found during:** Task 2's first real-Postgres GREEN attempt -- every authorization check for `user_group_capability_override.manage` returned `no_grant`/denied regardless of role, even for the actor holding `fansub_lead` with a real `role_capabilities` row from migration 0150.
- **Issue:** `GroupRightsResolution.Can()` only ever returns a computed state for actions present in the `actions []Action` slice `ResolveGroupRights` evaluates (`allKnownActions`). The action string `"user_group_capability_override.manage"` existed only as a plain string literal (per 137-04-SUMMARY.md's explicit note that "no Action constant exists... a plain cast works today") -- it was never added as a Go `Action` constant nor to `allKnownActions`, so `ResolveGroupRights` could never grant it at all, in production or in tests. This is the exact same class of defect 137-05 found and fixed for five Phase-136 actions.
- **Fix:** Added `permissions.ActionUserGroupCapabilityOverrideManage` and appended it to `allKnownActions`. Updated the two permissions-package D-10 catalog-consistency stub fixtures (`capability_registry_test.go`'s `roleMatrixStubData()`, `permissions_reload_test.go`'s `fullValidCacheData()`) to include it under `RoleFansubLead`, matching migration 0150's real seed.
- **Files modified:** `backend/internal/permissions/permissions.go`, `backend/internal/permissions/capability_registry_test.go`, `backend/internal/permissions/permissions_reload_test.go`
- **Verification:** `go test ./internal/permissions/...` green (34 test functions, zero regressions); the new EffectiveRightsService tests now correctly authorize `fansub_lead` for the management capability.
- **Committed in:** `ed6e14f3` (Task 2)

**2. [Rule 1 - Bug] `internal/handlers/app_auth_test.go`'s own D-10 catalog fixture needed the same completion**
- **Found during:** Task 2's `go test ./internal/handlers/...` sanity sweep after fixing item 1 above.
- **Issue:** `appAuthCapabilityCacheLoader.LoadRoleCapabilities` (the handlers package's own complete-action-list stub, used by six tests via `loadAppAuthCapabilityTestCache`) enumerated every pre-137-06 action explicitly; adding a new action to `allKnownActions` (item 1) made its own `Service.LoadCache` call fail the same D-10 check, breaking those six tests and everything that runs after them in the same test binary.
- **Fix:** Added `permissions.ActionUserGroupCapabilityOverrideManage` to `appAuthCapabilityCacheLoader`'s `allActions` list (already assigned to `RoleFansubLead`, so no other role mapping needed).
- **Files modified:** `backend/internal/handlers/app_auth_test.go`
- **Verification:** All tests reachable after `loadAppAuthCapabilityTestCache` runs (e.g. `TestGetFansubGroupCapabilities*`, `TestCreateFansubGroupInvitation*`) pass again. See "Issues Encountered" for the larger, pre-existing `internal/handlers` gap this surfaced but did not cause.
- **Committed in:** `ed6e14f3` (Task 2)

---

**Total deviations:** 2 auto-fixed (both Rule 1, both a direct, necessary consequence of D07's own `must_haves` requiring a working management-capability authorization check -- without item 1, this plan's core deliverable could never actually authorize anyone).
**Impact on plan:** No scope creep -- both fixes are strictly required for `EffectiveRightsService.MutateOverride`'s own D07 authorization to function at all, in production or in this plan's own tests.

## Known Stubs

None -- this plan is pure transactional business-logic/service code plus its own real-Postgres and pure-Go test coverage; no UI, no partial data wiring.

## Threat Flags

None -- every surface this plan introduces (the management-capability authorization check, the group/membership/catalog validation sequence, the atomic mutation+history transaction, the row-locking concurrency behavior) is exactly what the plan's own `<threat_model>` anticipated. No new network endpoint or HTTP auth path was added (this plan is service-layer only; the future Override Mutation API plan wires HTTP handlers on top of this).

## Issues Encountered

While diagnosing the D-10 fallout above, discovered (but explicitly did **not** fix, per the SCOPE BOUNDARY rule) a pre-existing, unrelated `internal/handlers` test-infrastructure gap: roughly twenty tests across ~10 files (`admin_content_anime_project_notes_test.go`, `admin_content_anime_theme_segment_assignments_test.go`, `admin_content_anime_theme_segment_range_autoassign_test.go`, `admin_content_fansub_releases_contributions_handlers_test.go`, `admin_content_fansub_releases_test.go`, `admin_content_release_version_media_test.go`, and a handful of `app_auth_test.go` tests declared before its own cache-loading helper's first call) depend on role-based `permissions.roleAllows`/`RoleAllowsAction` grants but never call `permissions.Service.LoadCache`, so they observe a `nil` package-level cache and always deny/return false. Verified this is **not** caused by this plan: every one of these tests fails identically in complete isolation (`go test ./internal/handlers -run '<TestName>'`, a single-test binary that never reaches `app_auth_test.go`'s cache-loading tests), independent of the `allKnownActions` change. Full detail and a recommended fix (a package-level `TestMain` mirroring `internal/repository/testmain_test.go`'s existing precedent) are in `.planning/phases/137-central-effective-rights-resolver-overrides/deferred-items.md`.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- Plan 137-07 (Effective-Rights Inspection API / UX) can project `GroupRightsResolution`/`CapabilityRightState` directly, unaffected by this plan.
- Plan 137-08 (Override Mutation API, BOLA/IDOR-hardened handlers) can build directly on `EffectiveRightsService.MutateOverride` as its sole write path -- the command/result shapes (`EffectiveRightsOverrideMutationCommand`/`Result`) are ready for an HTTP handler to translate to/from the Phase-136 `CapabilityOverrideMutationRequest`/`Result` DTOs already declared in `backend/internal/handlers/capability_policy_contract.go`.
- The pre-existing `internal/handlers` role-cache test-ordering gap documented above remains open and unrelated to this plan's own must_haves; it does not block 137-07/137-08 but should be considered before any future plan adds new role-grant-dependent handler tests to files that run before `app_auth_test.go` in file order.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 06*
*Completed: 2026-08-21*

## Self-Check: PASSED

All created files verified present on disk (`effective_rights_service.go`,
`effective_rights_service_test.go`, `effective_rights_concurrency_test.go`,
`deferred-items.md`, this summary); both task commit hashes (`f0b1fa34`, `ed6e14f3`)
verified present in `git log`.
