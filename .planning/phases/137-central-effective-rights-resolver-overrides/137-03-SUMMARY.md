---
phase: 137-central-effective-rights-resolver-overrides
plan: 03
subsystem: backend
tags: [postgres, repository, authorization, capability-overrides, tdd]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    plan: 01
    provides: Migration 0150 (management capability + ten-action pilot user_overridable=true set)
provides:
  - AuthzUserOverridesRepository (backend/internal/repository/authz_user_overrides.go) -- batch-load, membership lock, override-policy read, upsert/delete with before/after state, append-only history insert/list
  - backend/internal/testsupport/phase137_postgres.go real-Postgres harness (migrations 0085/0100/0108/0112/0146/0150)
affects: [137-04, 137-05, 137-06, 137-07, 137-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "authzUserOverridesDBTX local interface embedding repository.DBTX + Query, mirroring the existing releaseCrewDBTX pattern, so one repository implementation runs unmodified against *pgxpool.Pool and a caller-owned pgx.Tx"
    - "Lock-then-mutate before/after exposure: UpsertOverride/DeleteOverride return the pre-mutation effect state directly from the same locked round trip, so a future transactional mutation service can compute real-change-vs-no-op without a second read"

key-files:
  created:
    - backend/internal/repository/authz_user_overrides.go
    - backend/internal/repository/authz_user_overrides_test.go
    - backend/internal/testsupport/phase137_postgres.go
  modified: []

key-decisions:
  - "LockTargetMembership resolves and locks the membership row by (app_user_id, fansub_group_id) regardless of status, returning the row's real Status so a caller can distinguish an inactive membership from ErrNotFound (a genuine non-member) without a second, unscoped query -- directly implements this plan's must_haves truth and CONTEXT.md D02's dormant-override model."
  - "UpsertOverride/DeleteOverride each do their own row lock (FOR UPDATE / DELETE...RETURNING) and return before/after effect state in one method call, rather than requiring the caller to make a separate LockCurrentOverride call first -- matches the plan's must_haves truth that 'Upsert/delete operations expose before/after state to the caller.'"
  - "LoadOverridePolicy reads action_definitions.user_overridable directly so a future mutation service can reject a non-overridable action with a clean validation error, ahead of the database's fail-closed composite FK (migration 0146) as the last-line backstop."
  - "No resolver precedence logic (platform-admin bypass, deny-over-allow, specialized-grant integration) was added to this repository, per the plan's explicit action constraint -- that belongs to a later Phase-137 plan's central resolver."

patterns-established:
  - "phase137_postgres.go's real-migration prerequisite chain (0085 role_definitions -> 0100 fansub_lead seed -> 0108 action_definitions/role_capabilities -> 0112 techadmin/gfxler+assignable -> 0146 override schema -> 0150 pilot overridable set) is the reusable dependency order for every later Phase-137 real-Postgres test file that needs a genuinely migrated capability-override schema."

requirements-completed: [CAP-01, CAP-02, CAP-05, CAP-06, CAP-07, QUAL-03]

# Metrics
duration: ~30min
completed: 2026-08-21
---

# Phase 137 Plan 03: Batch/Transactional User-Override Repository Primitives Summary

**New `AuthzUserOverridesRepository` gives the (not-yet-built) resolver and mutation service one group-scoped, transaction-compatible surface for batch-loading current overrides, locking target membership, validating catalog policy, and mutating/auditing overrides -- with zero embedded precedence logic and zero N+1 query patterns.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2 completed
- **Files modified:** 3 (2 new backend files, 1 new testsupport harness)

## Accomplishments

- `backend/internal/testsupport/phase137_postgres.go` opens a schema-isolated real-Postgres fixture and applies the exact real migration chain (`0085`, `0100`, `0108`, `0112`, `0146`, `0150`) needed to build a genuine `action_definitions`/`role_definitions`/`role_capabilities`/`user_group_capability_overrides`/`user_group_capability_override_history` schema, following the phase107/117/135 DSN-guarded convention (`TEAM4S_PHASE137_TEST_DSN`, `team4s_phase137_test_[a-z0-9]+` database name, `phase137_[a-z0-9_]+` schema name).
- `backend/internal/repository/authz_user_overrides.go` implements `AuthzUserOverridesRepository` with seven primitives, all built on a local `authzUserOverridesDBTX` interface (embeds `repository.DBTX` + `Query`, mirroring `releaseCrewDBTX`) so the same code works on both `*pgxpool.Pool` and a caller-owned `pgx.Tx`:
  - `LoadCurrentOverrides(ctx, appUserID, fansubGroupID)` -- one batched query, group-scoped, never per-action.
  - `LockTargetMembership(ctx, appUserID, fansubGroupID)` -- `FOR UPDATE OF fgm` row lock; `ErrNotFound` only for a genuine non-member, otherwise the real membership `Status` is returned so the caller can see "active" vs "disabled".
  - `LoadOverridePolicy(ctx, actionCode)` -- reads `action_definitions.user_overridable` for service-level validation.
  - `UpsertOverride(ctx, appUserID, fansubGroupID, actionCode, effect, actorAppUserID)` -- locks the current row, then `INSERT ... ON CONFLICT DO UPDATE`, returning `(beforeEffect *string, afterEffect string, err error)` in one call.
  - `DeleteOverride(ctx, appUserID, fansubGroupID, actionCode)` -- `DELETE ... RETURNING effect`, returning `nil` (no error) for a true no-op when nothing existed.
  - `AppendHistory(ctx, entry)` -- one immutable insert; the DB's append-only trigger (migration 0146) is the enforcement backstop.
  - `ListHistoryForSubject(ctx, appUserID, fansubGroupID, limit, offset)` -- always scoped by both IDs, most-recent-first.
- `backend/internal/repository/authz_user_overrides_test.go` proves, against real Postgres: group scoping (a foreign group's override/history row never leaks), the active/inactive/missing membership distinction, catalog-policy reads for an overridable action, a non-overridable action, and an unknown action code, before/after state across `none->allow->deny->(deleted)`, idempotent delete-of-nothing, and that the append-only trigger genuinely rejects `UPDATE` independent of this repository's own discipline. A separate pure-Go validation table (`TestPhase137AuthzUserOverridesValidation`, no DB needed) proves every method rejects a nil repository/db or invalid IDs/action with `ErrValidation`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Establish the Phase-137 real-Postgres harness and repository behavior tests** - `fc249e83` (test) - RED confirmed: `go test ./internal/repository -run Phase137` failed to build (`undefined: AuthzUserOverridesRepository`) before the repository existed; `testsupport` package itself built cleanly.
2. **Task 2: Implement batch and transactional override repository primitives** - `0870bfdf` (feat) - GREEN confirmed: all Phase137 repository tests pass against a disposable `team4s_phase137_test_*` database; `go build ./...` and `git diff --check` clean; `go test ./internal/repository/... ./internal/testsupport/...` shows zero new failures beyond pre-existing, unrelated Phase128/134 environmental gaps (missing `TEAM4S_PHASE128_TEST_DSN`, unreachable live Keycloak/API endpoints).

**Plan metadata:** (this commit, once created)

_Note: This is a `tdd="true"` plan executed with a strict RED -> GREEN cycle per task, not a plan-level TDD gate; the test file was written first and confirmed to fail (compile error) before the implementation was added._

## Files Created/Modified

- `backend/internal/testsupport/phase137_postgres.go` - Real-Postgres harness applying the real migration chain needed for a genuine Phase-136/137 capability-override schema.
- `backend/internal/repository/authz_user_overrides.go` - `AuthzUserOverridesRepository` and its supporting types (`UserGroupCapabilityOverride`, `TargetMembership`, `CapabilityOverridePolicy`, `UserGroupCapabilityOverrideHistoryEntry`).
- `backend/internal/repository/authz_user_overrides_test.go` - Pure-Go validation table plus five real-Postgres behavior tests covering every must_haves truth in the plan.

## Decisions Made

- **Membership-lock scope:** `LockTargetMembership` deliberately does not filter on `status = 'active'` in its `WHERE` clause -- it locks and returns whatever membership row exists for the exact `(app_user_id, fansub_group_id)` pair, letting the caller inspect `Status`. This is what makes CONTEXT.md D02's "retain overrides, but make them ineffective without an active membership" model implementable one layer up, without a second unscoped query to tell "inactive" apart from "never existed."
- **Before/after exposure shape:** `UpsertOverride`/`DeleteOverride` return the pre-mutation state as part of their own return values (not via a separate `LockCurrentOverride` method the caller must call first), matching the plan's `must_haves.truths` literally. This keeps the future mutation service's "compute real-change-vs-no-op" logic to one repository call per operation instead of two.
- **No precedence logic here:** Per the plan's explicit action text ("Do not add resolver business precedence here"), this repository contains zero platform-admin/disabled-actor/deny-over-allow/specialized-grant logic. It only exposes batched facts; the central resolver (a later Phase-137 plan) owns evaluation.

## Deviations from Plan

**1. [Rule 1 - Bug] Test-helper primary-key collision in multi-membership seed fixtures**
- **Found during:** Task 2's first real-Postgres GREEN run.
- **Issue:** `seedPhase137Membership`'s `members`/`app_users`/`fansub_groups` inserts had no `ON CONFLICT` clause; three tests intentionally re-seed the same member, app_user, or fansub_group across two `seedPhase137Membership` calls (e.g. one app_user with active memberships in two different groups, or two app_users sharing one group), which is a legitimate real-world shape but collided on the shared parent tables' primary keys.
- **Fix:** Added `ON CONFLICT DO NOTHING` to the three parent-table inserts in the test helper only (`members`, `app_users`, `fansub_groups`); the `fansub_group_members` insert itself remains strict since each call's membership ID is intentionally unique.
- **Files modified:** `backend/internal/repository/authz_user_overrides_test.go`.
- **Commit:** `0870bfdf` (folded into the Task 2 GREEN commit, since it was found and fixed before that commit was made).

No other deviations - the delivered repository's method set, signatures, and behavior match the plan's `must_haves.truths`/`artifacts`/`key_links` exactly.

## Known Stubs

None - this plan is pure repository/persistence code plus its own real-Postgres test harness; no UI, no partial data wiring.

## Threat Flags

None - every surface this plan introduces (batched group-scoped override reads, membership row locking, catalog-policy reads, upsert/delete with before/after state, append-only history insert/list) is exactly what the plan's own `<threat_model>` anticipated: BOLA/IDOR is closed by every query's explicit `fansub_group_id` scope and server-resolved target membership; the audit/state race concern is addressed by lock-capable primitives designed for one caller-owned transaction; N+1 is closed by `LoadCurrentOverrides`' single batched query. No new network endpoint or auth path was added (this plan is repository-layer only).

## Issues Encountered

None beyond the test-helper fixture bug documented above under Deviations. `TEAM4S_PHASE137_TEST_DSN` is not set by default in this environment; a disposable guarded database (`team4s_phase137_test_1057612628`, matching `OpenPhase137Postgres`'s required naming pattern) was created for the real-Postgres GREEN proof and dropped again after tests passed, following the same disposable-test-database convention documented in Phase 137 Plan 01's summary.

## Next Phase Readiness

- The central resolver plan (`ResolveGroupRights`, `SpecializedGrantProvider`, precedence evaluation per CONTEXT.md D01/D03/D04) can now batch-load user overrides via `LoadCurrentOverrides` without any per-action SQL, and can resolve/lock the actor's or a target's membership via `LockTargetMembership` inside its own transaction.
- The override-mutation service plan (D06/D07/D08 -- atomic mutation + audit, management-capability gating, BOLA/IDOR-hardened handlers) can build directly on `LockTargetMembership` + `LoadOverridePolicy` + `UpsertOverride`/`DeleteOverride` + `AppendHistory`, mirroring `ReviewService.changeDelegation`'s `Begin -> defer Rollback -> mutate -> audit -> Commit` transaction shape with this plan's primitives standing in for `ReviewDelegationRepository`'s calls.
- The Override-History API plan can build directly on `ListHistoryForSubject`, which already enforces the "listed only within an explicit group scope" must_haves truth.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 03*
*Completed: 2026-08-21*
