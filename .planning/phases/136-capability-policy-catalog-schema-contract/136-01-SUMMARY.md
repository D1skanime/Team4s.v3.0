---
phase: 136-capability-policy-catalog-schema-contract
plan: 01
subsystem: database
tags: [postgresql, capabilities, roles, authorization, audit]

requires:
  - phase: 135-invited-member-onboarding
    provides: canonical assignable role definitions and IdP-owned global-role boundary
provides:
  - fail-closed capability override policy metadata
  - canonical semantic role presentation keys and zero-right karaoke_fx seed
  - group-scoped personal allow/deny state with immutable transition history
  - reversible migration and focused PostgreSQL contract proof
affects: [136-02, 136-03, 136-09, phase-137, phase-138]

tech-stack:
  added: []
  patterns: [catalog-gated composite foreign key, append-only audit trigger, semantic presentation keys]

key-files:
  created:
    - database/migrations/0146_capability_policy_catalog.up.sql
    - database/migrations/0146_capability_policy_catalog.down.sql
    - backend/internal/migrations/phase136_capability_policy_catalog_test.go
  modified: []

key-decisions:
  - "Personal override rows reference the canonical action code together with user_overridable=true, so fail-closed catalog policy is enforced by PostgreSQL."
  - "Role presentation stores only stable color_key and icon_key semantics; CSS classes and component names remain outside the database."
  - "karaoke_fx is assignable in fansub_group and anime_contribution contexts but starts with zero operative role_capabilities mappings."

patterns-established:
  - "Catalog-gated override state: current rows can reference only explicitly opted-in capabilities."
  - "Immutable transition history: before/after must differ, reasons are shape-checked, and UPDATE/DELETE are rejected."

requirements-completed: [CAP-04, CAP-12, CAP-14, QUAL-04]

duration: 5min
completed: 2026-08-20
---

# Phase 136 Plan 01: Capability Policy Catalog Schema Summary

**PostgreSQL now owns fail-closed personal override policy, semantic role presentation, zero-right `karaoke_fx`, and immutable group-scoped allow/deny provenance through reversible migration 0146.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-20T17:18:27Z
- **Completed:** 2026-08-20T17:22:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended the existing `action_definitions` and `role_definitions` authorities instead of introducing a parallel registry.
- Added seven narrow, initially unmapped group actions and the distinct, assignable, zero-right `karaoke_fx` role.
- Added catalog-gated current personal overrides plus append-only transition history with actor, target, group, action, reason and before/after provenance.
- Proved focused up/down/up behavior, protected-action rejection, uniqueness, reason rules, no-op rejection, append-only enforcement and reverse-index use.
- Proved the complete fresh migration chain applies and reverses with migration 0146 included.

## Task Commits

Each task was committed atomically:

1. **Task 1: Specify the fresh schema and catalog contract in migration tests** - `2d611078` (test)
2. **Task 2: Implement reversible catalog, defaults, override and audit schema** - `da121b00` (feat)

## Files Created/Modified

- `database/migrations/0146_capability_policy_catalog.up.sql` - Catalog metadata, narrow actions, `karaoke_fx`, override state/history, constraints, comments and indexes.
- `database/migrations/0146_capability_policy_catalog.down.sql` - Dependency-ordered reversal of every migration-0146 object.
- `backend/internal/migrations/phase136_capability_policy_catalog_test.go` - Source and live PostgreSQL contract tests, including index-plan assertions.

## Decisions Made

- The composite action-policy foreign key is the database enforcement point for explicit `user_overridable` opt-in.
- IdP platform-admin authority is not referenced by current group override rows; `actor_is_platform_admin` is only an audit-time provenance snapshot supporting the approved reason exemption.
- Confirmed operative mappings for `gfxler`, `techadmin`, `founder`, and `co_leader` remain absent until Plan 136-09 wires the exact handler enforcement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Aligned the RED contract with the planned public DTO keys**
- **Found during:** Task 2
- **Issue:** The initial RED test named speculative presentation fields instead of the phase's planned `color_key` and `icon_key` contract.
- **Fix:** Replaced the speculative names and expanded the live test to prove policy constraints, audit immutability and reverse-index use.
- **Files modified:** `backend/internal/migrations/phase136_capability_policy_catalog_test.go`
- **Verification:** Focused Phase136 tests and the full fresh migration proof pass.
- **Committed in:** `da121b00`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** The correction keeps the database contract aligned with subsequent Phase-136 DTO plans; no scope was added beyond planned verification.

## Issues Encountered

- The backend container retained stale Go build-cache output during the first rerun; clearing the Go build/test cache exposed the current source and the final checks passed.

## User Setup Required

None - no external service configuration required.

## Verification

- `docker compose exec -T -e TEAM4S_PHASE106_TEST_DSN=... team4sv30-backend /usr/local/go/bin/go test ./internal/migrations -run Phase136 -count=1` — passed.
- `docker compose exec -T -e TEAM4S_PHASE134_MIGRATION_DSN=... team4sv30-backend /usr/local/go/bin/go test ./internal/migrations -run TestPhase134MigrationFreshUpDownProof -count=1` — passed.
- `git diff --check` — passed.
- Required contract grep for `karaoke_fx`, `user_overridable`, `allow`, `deny`, and `role_capabilities_action_role_idx` — passed.

## Known Stubs

None.

## Next Phase Readiness

- Plans 136-02 and 136-03 can project the new catalog metadata through backend and shared API contracts.
- Plan 136-09 can deliberately seed the approved role defaults against the seven narrow action keys.
- Runtime override evaluation and mutation remain correctly deferred to Phase 137.

## Self-Check: PASSED

- All three owned files exist.
- Task commits `2d611078` and `da121b00` exist in repository history.
- Focused and full fresh up/down verification passed after the final changes.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
