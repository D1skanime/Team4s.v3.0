---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 01
subsystem: auth
tags: [go, postgres, permissions, role-definitions, capability-registry]

# Dependency graph
requires:
  - phase: 145-registry-selbstschutz
    provides: reserved group_member pseudo-role in role_definitions/role_capabilities, the NOT reserved filter pattern on 3 sibling queries, and the real-Postgres OpenPhase145Postgres test fixture (migrations 0085/0100/0108/0112)
provides:
  - MembershipBaselineActionCodes exported []Action var as the single Go source for the 3 membership-baseline action codes
  - ListGroupHistoryRoleDefinitions SQL predicate parity with its 3 sibling queries (AND NOT rd.reserved)
  - Real-Postgres proof that all 4 sibling role-picker queries exclude the reserved pseudo-role
  - Anti-drift assertion tying the migration 0160 seed to permissions.MembershipBaselineActionCodes
affects: [146-02, 146-03, admin_capability_handler.go mutation guards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single Go source var pattern for triplicated literal constants, consumed by both runtime validators and test anti-drift assertions"

key-files:
  created: []
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/repository/membership_baseline_registry_test.go

key-decisions:
  - "MembershipBaselineActionCodes lives directly above validateMembershipBaselineRegistryPresence in permissions.go, matching the plan's exact interface contract for Plan 146-03's later admin_capability_handler.go guards to consume"
  - "permissions.go's pre-existing 928-line size (already 2x CLAUDE.md's 450-line cap) is left untouched as carried-forward debt outside this additive plan's scope, per the plan's explicit note"

patterns-established:
  - "Registry-consistency test proofs (real Postgres, no SKIP) should assert both structural predicate parity (4th sibling query) and anti-drift equality against the single Go source, not a second hardcoded literal"

requirements-completed: ["Criterion 3", "Criterion 4"]

# Metrics
duration: 3min
completed: 2026-09-04
---

# Phase 146 Plan 01: Registry-Selbstschutz Summary

**MembershipBaselineActionCodes exported var closes the 3x-duplicated baseline-action-code literal, and ListGroupHistoryRoleDefinitions now carries the same NOT reserved predicate as its 3 siblings, both proven against real Postgres.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-04T15:42:10Z
- **Completed:** 2026-09-04T15:44:58Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extracted `MembershipBaselineActionCodes` as the sole Go-source `[]Action` literal for the 3 membership-baseline action codes, consumed by `validateMembershipBaselineRegistryPresence`
- Closed Success Criterion 3: `ListGroupHistoryRoleDefinitions`'s WHERE predicate now excludes the reserved pseudo-role, matching its 3 already-correct siblings
- Extended real-Postgres test coverage (no SKIP) proving all 4 sibling role-picker queries exclude `group_member`, and proving the migration 0160 seed can never silently drift from `permissions.MembershipBaselineActionCodes`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract MembershipBaselineActionCodes as the single Go source (Criterion 4)** - `aec4b581` (refactor)
2. **Task 2: Add the missing NOT reserved filter to ListGroupHistoryRoleDefinitions (Criterion 3)** - `71b5026d` (fix)
3. **Task 3: Extend real-Postgres coverage for the 4th query and the anti-drift assertion** - `2d3ae85a` (test)

**Plan metadata:** (pending — see final commit below)

## Files Created/Modified
- `backend/internal/permissions/permissions.go` - Added exported `MembershipBaselineActionCodes` var; `validateMembershipBaselineRegistryPresence` now iterates it instead of an inline literal
- `backend/internal/repository/hist_group_member_roles_repository.go` - `ListGroupHistoryRoleDefinitions`'s SQL WHERE clause gained `AND NOT rd.reserved`
- `backend/internal/repository/membership_baseline_registry_test.go` - Added a 4th assertion block (`ListGroupHistoryRoleDefinitions` excludes `group_member`) to `TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix`; changed the migration-seed assertion in `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights` to compare against `permissions.MembershipBaselineActionCodes` instead of a second hardcoded string literal

## Decisions Made
- Created a new local `team4s_phase145_test_146` Postgres database on the shared dev Postgres container to run the real-Postgres tests (no such database existed yet for this phase); DSN used only for this execution's local verification runs, matching the existing `team4s_phase145_test_*` naming pattern the fixture code enforces
- No production/decision-level deviations - plan executed exactly as written

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their locked `<action>`/`<behavior>` specs and acceptance criteria exactly; no Rule 1-4 auto-fixes were needed.

## Issues Encountered
- No `TEAM4S_PHASE145_TEST_DSN`-eligible database existed yet on the shared dev Postgres container (`team4sv30-db`); a fresh `team4s_phase145_test_146` database matching the fixture's regex was created via `docker exec team4sv30-db psql` before the tests could run. No `go` binary is available directly in the sandbox host PATH, so all `go build`/`go vet`/`go test` verification commands were run via `docker exec team4sv30-backend` against the already-running backend container instead.

## TDD Gate Compliance

Task 3 is marked `tdd="true"` but is structurally a coverage-extension task over already-implemented fixes (Tasks 1-2 landed the production changes first, per the plan's fixed task order) rather than new production behavior — there is no `feat(...)` commit after the `test(...)` commit for this plan, by design. The plan's Task 3 `<behavior>` block explicitly scopes this to extending existing real-Postgres test functions with new assertions against already-shipped code, not driving new implementation via RED/GREEN. Both extended tests were confirmed to run and PASS (no SKIP) against real Postgres before commit, satisfying the plan's `<verification>` block.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `MembershipBaselineActionCodes` is ready for Plan 146-03's `admin_capability_handler.go` mutation guards to consume directly
- Criterion 3 and Criterion 4 of Phase 146 Block 1 (Registry-Selbstschutz) are both closed
- No blockers for the next plan in Wave 1/2 of Phase 146

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*

## Self-Check: PASSED

All 3 modified source/test files and this SUMMARY.md exist on disk; all 4 recorded commit hashes (aec4b581, 71b5026d, 2d3ae85a, 08fe6b1d) are present in `git log --all`.
