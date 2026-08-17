---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 02
subsystem: backend
tags: [go, postgres, pgx, sql, repository, testing]

# Dependency graph
requires: []
provides:
  - "ListFansubGroupRoleDefinitions filtered by assignable = true only (single-predicate query)"
  - "testsupport.OpenPhase135Postgres live-DB fixture harness (0085/0100/0103/0112 migration chain)"
  - "TestListFansubGroupRoleDefinitionsAssignableOnly live-DB regression proof of the exact assignable-only code set"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-phase isolated-schema Postgres test fixture (OpenPhaseNNNPostgres) mirroring phase106/117's SKIP-not-FAIL convention, applying real migration files via ApplySQLFile + runtime.Caller(0) path resolution"

key-files:
  created:
    - backend/internal/testsupport/phase135_postgres.go
    - backend/internal/repository/hist_group_member_roles_fansub_group_test.go
  modified:
    - backend/internal/repository/hist_group_member_roles_repository.go

key-decisions:
  - "createPhase135Prerequisites creates a minimal single-column hist_group_member_roles(role_code TEXT) stand-in before applying migration 0085, since 0085's Step 4 ALTER TABLE ... ADD CONSTRAINT fk_hist_group_member_roles_role_code requires the table to already exist."
  - "OpenPhase135Postgres uses the softer SKIP-not-FAIL convention (mirrors phase106/107/117) rather than phase128's hard Fatalf-when-unset convention, per the plan's explicit instruction."
  - "Container source sync is not live (docker-compose.override.yml only defines `develop.watch`, no bind mount for backend/), so new/changed files were copied into team4sv30-backend via `docker compose cp` before build/test verification; git-tracked source on the host is the sole source of truth."

patterns-established:
  - "D-06 fix pattern: group-role/context pickers must filter on the single canonical `assignable = true` predicate rather than OR-ing in raw `contexts` array membership checks, which silently reintroduce anime_contribution-only roles as migrations evolve the contexts column independently of assignable."

requirements-completed: [D-06]

# Metrics
duration: 12min
completed: 2026-08-17
---

# Phase 135 Plan 02: Fix ListFansubGroupRoleDefinitions assignable-only predicate Summary

**`ListFansubGroupRoleDefinitions`'s SQL predicate no longer ORs `assignable = true` with two pre-migration-0112 `contexts` checks that reintroduced every `anime_contribution` role (including `admin`/"Administration") into the group-role picker; a new live-DB regression test proves the fix against a real, freshly-migrated schema.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-17T13:00:00Z
- **Completed:** 2026-08-17T13:12:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `hist_group_member_roles_repository.go`'s `ListFansubGroupRoleDefinitions` query now filters exclusively on `WHERE assignable = true`, removing the `OR 'fansub_group' = ANY(contexts) OR 'anime_contribution' = ANY(contexts)` branches that let non-assignable contribution/credit roles leak into the group-role picker (Finding #7 / Pitfall 2, D-06).
- New `testsupport.OpenPhase135Postgres` harness (mirroring the phase106/117 SKIP-not-FAIL convention, not phase128's hard-Fatalf convention) applies the real `0085`, `0100`, `0103`, `0112` migration chain against an isolated schema.
- New `TestListFansubGroupRoleDefinitionsAssignableOnly` proves the query returns exactly `{techadmin, gfxler, fansub_lead, co_leader, founder, project_lead}` and explicitly excludes `{admin, translator, editor, timer, typesetter, encoder, raw_provider, quality_checker, designer, other, leader, project_manager}`.

## Task Commits

1. **Task 1: Simplify ListFansubGroupRoleDefinitions's WHERE predicate to assignable = true only** - `72c334de` (fix)
2. **Task 2: Add live-DB regression test proving the exact assignable-only role set** - `6734cf66` (test)

## Files Created/Modified
- `backend/internal/repository/hist_group_member_roles_repository.go` - `ListFansubGroupRoleDefinitions`'s query body reduced to the single predicate `WHERE assignable = true`; no other function touched.
- `backend/internal/testsupport/phase135_postgres.go` (new) - `OpenPhase135Postgres`, `phase135DatabasePattern`/`phase135SchemaPattern`, and `createPhase135Prerequisites` (stand-in table + 0085/0100/0103/0112 migration apply via `ApplySQLFile`).
- `backend/internal/repository/hist_group_member_roles_fansub_group_test.go` (new) - `TestListFansubGroupRoleDefinitionsAssignableOnly`, asserting the exact 6-code assignable set and the exact 12-code exclusion set.

## Decisions Made
- Confirmed via `docker compose exec ... go test -list` that the container's `/app` source tree is not live-synced from the host by default (`docker-compose.override.yml` only wires `develop.watch`, no backend bind mount); used `docker compose cp` to push the new/modified files into `team4sv30-backend` before running `go build`/`go vet`/`go test` so verification ran against the actual edited code rather than stale container state.

## Deviations from Plan

None. Both tasks match the plan's `<action>`/`<acceptance_criteria>` exactly; the exact assignable/exclusion code sets matched migration 0112's Step 6 UPDATE list without adjustment.

## Issues Encountered
- Initial `docker compose exec -T team4sv30-backend go build ./...` (run before discovering the missing live-sync) silently succeeded against stale container source, which would have produced a false-positive verification. Caught by cross-checking file mtimes inside vs. outside the container before trusting the result; resolved via `docker compose cp` for all three touched files, then re-verified build/vet/test.

## User Setup Required

None - no external service configuration required. A disposable `team4s_phase135_test_a1` database was created on `team4sv30-db` for the live-DB test run (consistent with the existing phase128/117 test-database convention); it is left in place for reuse by future Phase 135 plans' Postgres tests.

## Next Phase Readiness
D-06 is closed. No other plan in this phase depends on this fix's output; ready to proceed to the next plan in Phase 135.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-17*
