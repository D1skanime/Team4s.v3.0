---
phase: 134-fixture-backed-verification-rollout
plan: 02
subsystem: testing
tags: [go, postgres, migrations, pgxpool, fresh-proof, testify]

# Dependency graph
requires: []
provides:
  - "backend/internal/testsupport/phase134_postgres.go: OpenPhase134MaintenancePool / DropAndCreatePhase134FreshDatabase / Phase134FreshDatabaseDSN guarded ephemeral-database helper"
  - "backend/internal/migrations/fresh_proof_test.go: TestPhase134MigrationFreshUpDownProof, the first end-to-end fresh/Up/Down/residual-table proof of the full 145-pair migration chain"
  - "database/migrations/0037_add_release_decomposition_tables.down.sql: now a real, reversible rollback instead of a no-op"
affects: [134-05-reset-script]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mandatory (never-skip) DSN-gated integration test: t.Fatalf, not t.Skipf, when the dedicated env var is unset — mirrors phase128's fail-closed style since this is a mandatory gate component (D-04), not an opt-in developer convenience"
    - "Double-guard maintenance-database validation: parsed DSN database name AND a live current_database() round-trip must both equal \"postgres\" before any DROP/CREATE DATABASE runs"
    - "t.Cleanup LIFO ordering for pool-then-drop teardown: register the pool-close cleanup before the drop-again cleanup so the drop (which needs the pool open) runs first when cleanups unwind in reverse registration order"

key-files:
  created:
    - backend/internal/testsupport/phase134_postgres.go
    - backend/internal/migrations/fresh_proof_test.go
  modified:
    - database/migrations/0037_add_release_decomposition_tables.down.sql

key-decisions:
  - "Fixed defer/t.Cleanup ordering bug in the plan's own action text: a bare `defer maintPool.Close()` runs when the test function returns, before any t.Cleanup callback fires, so the final teardown drop (registered via t.Cleanup) always hit a closed pool. Replaced the bare defer with a second t.Cleanup registered first (LIFO: last-registered runs first), so the teardown drop runs while the pool is still open."
  - "Rewrote migration 0037's down.sql from an intentional no-op into a real reverse-order rollback of everything its up.sql adds, since its FK from release_streams to release_variants(id) blocked migration 0035's DROP TABLE release_variants the first time the full Down chain ever ran end-to-end."

requirements-completed: [PMQA-03]

# Metrics
duration: 30min
completed: 2026-08-16
---

# Phase 134 Plan 02: Migration Fresh/Up/Down Proof Summary

**Built the first-ever fresh/Up/Down/residual-table proof of the full 145-pair migration chain, and along the way fixed a genuinely broken historical down-migration (0037) that had never been exercised end-to-end before.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-16T14:12:21Z (approx.)
- **Completed:** 2026-08-16T14:20:00Z (approx.)
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 fixed)

## Accomplishments
- `backend/internal/testsupport/phase134_postgres.go` provides a guarded maintenance-connection helper: mandatory `TEAM4S_PHASE134_MIGRATION_DSN` (hard-fails, never skips), double-checks the DSN targets the `postgres` maintenance database (parsed config + live `current_database()`), and exposes `DropAndCreatePhase134FreshDatabase` using `pgx.Identifier{}.Sanitize()` for the fixed `team4s_phase134_migration_fresh` database name plus a `pg_terminate_backend` pre-step so DROP DATABASE never blocks on stale sessions.
- `backend/internal/migrations/fresh_proof_test.go`'s `TestPhase134MigrationFreshUpDownProof` DROPs+CREATEs the ephemeral database, runs `migrations.Runner.Up`, asserts zero pending/missing migrations via `Runner.Status`, runs `Runner.Down` for every applied migration, asserts zero applied afterward, and asserts zero residual `information_schema.tables` rows in `public` excluding `schema_migrations`.
- Running the test with `TEAM4S_PHASE134_MIGRATION_DSN` unset produces a `t.Fatalf` failure (exit 1, visible red) — verified live. Running it with the DSN pointed at `postgres://team4s:team4s_dev_password@team4sv30-db:5432/postgres?sslmode=disable` exits 0 on two consecutive runs (idempotent, no leftover state accumulation), and `go build ./...` / `go vet ./...` stay clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Guarded maintenance-connection helper for the ephemeral migration-proof database** - `784f373d` (feat)
2. **Task 2: The fresh/up/down proof test itself** - `ce822772` (feat, includes the 0037 down.sql fix and the defer/t.Cleanup ordering fix)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `backend/internal/testsupport/phase134_postgres.go` - New: `OpenPhase134MaintenancePool`, `DropAndCreatePhase134FreshDatabase`, `Phase134FreshDatabaseDSN`
- `backend/internal/migrations/fresh_proof_test.go` - New: `TestPhase134MigrationFreshUpDownProof` with a package-level doc comment on the Pitfall-3 fix-don't-skip directive for future broken down migrations
- `database/migrations/0037_add_release_decomposition_tables.down.sql` - Rewritten from a documented no-op into a full reverse of its up.sql (drops `release_streams`/`stream_sources`/`visibilities`, drops the added columns/constraints/indexes on `release_variants`, `release_versions`, `fansub_releases`, `release_sources`, in strict reverse creation order)

## Decisions Made
- **Registered the maintenance pool's close via `t.Cleanup` instead of a bare `defer`, and ordered it before the final teardown-drop's `t.Cleanup`.** The plan's action text specified `defer maintPool.Close()` immediately after opening the pool, plus a separate `t.Cleanup` for the final re-drop. In Go, a test function's own `defer` statements run when the function body returns — before any `t.Cleanup` callback fires (those run afterward, in LIFO registration order). Following the plan literally closed the pool before the final drop could run, and the first live run confirmed this exact failure (`closed pool`). Registering `maintPool.Close()` as a second `t.Cleanup` call, placed before the drop-again cleanup in source order, makes LIFO unwinding do drop-then-close, which is correct.
- **Rewrote migration 0037's down.sql instead of skipping/steps-limiting the test.** The first live run of the full Down chain failed at migration 35 (`release_variants`) with `cannot drop table release_variants because other objects depend on it`. Root cause: migration 0037's up.sql creates `release_streams` with `variant_id BIGINT NOT NULL REFERENCES release_variants(id) ON DELETE CASCADE`, plus `stream_sources` and `visibilities` tables and several column/constraint/index additions on `release_sources`, `fansub_releases`, `release_versions`, and `release_variants` — but 0037's down.sql was a documented intentional no-op ("no destructive rollback is performed here"). Per RESEARCH.md's Pitfall 3 and the plan's explicit instruction, this is a genuine, previously-latent bug (never exercised before this test existed), not a Phase-134 scope violation. Fixed by writing a real reverse-order rollback. Verified downstream: 0097's down.sql already correctly drops its FK constraints into `visibilities` before the Down chain reaches 0037 (descending version order), so no further conflicts remained.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed migration 0037's no-op down.sql**
- **Found during:** Task 2, first live run of the fresh/up/down proof test
- **Issue:** `database/migrations/0037_add_release_decomposition_tables.down.sql` was an intentional no-op, leaving `release_streams`' FK to `release_variants(id)` (and `stream_sources`/`visibilities` tables, plus several column/constraint/index additions) in place. This blocked migration 0035's `DROP TABLE release_variants` the first time the full Down chain ever ran end-to-end in this codebase.
- **Fix:** Rewrote 0037's down.sql to reverse every statement in its up.sql, in strict reverse order (drop the three new tables first, then strip the added columns/constraints/indexes from the four altered tables).
- **Files modified:** `database/migrations/0037_add_release_decomposition_tables.down.sql`
- **Verification:** `TestPhase134MigrationFreshUpDownProof` passed on two consecutive live runs after the fix; `go build ./...` and `go vet ./...` stayed clean; `go test ./internal/migrations/...` showed no other regressions (only pre-existing DSN-gated Phase-128 tests fail-closed as expected when their own env vars are unset).
- **Committed in:** `ce822772` (Task 2)

**2. [Rule 1 - Bug] Fixed defer/t.Cleanup ordering that closed the maintenance pool before final teardown**
- **Found during:** Task 2, second live run (after fixing deviation 1) surfaced a `closed pool` error during the test's registered final-teardown cleanup
- **Issue:** The plan's action text specified `defer maintPool.Close()` immediately after opening the maintenance pool, with a separate `t.Cleanup` registered afterward to re-run `DropAndCreatePhase134FreshDatabase`. Go's `defer` statements inside a test function execute when the function body returns, which happens before any `t.Cleanup` callback runs — so the pool was always closed by the time the final teardown drop tried to use it.
- **Fix:** Replaced the bare `defer maintPool.Close()` with a `t.Cleanup(func() { maintPool.Close() })` registered before the drop-again `t.Cleanup`, so LIFO unwinding runs the drop first (pool still open) and the close second.
- **Files modified:** `backend/internal/migrations/fresh_proof_test.go`
- **Verification:** `TestPhase134MigrationFreshUpDownProof` passed cleanly (no cleanup errors) on two consecutive live runs.
- **Committed in:** `ce822772` (Task 2)

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both fixes were necessary for the test to actually pass and were the intended, expected outcome of building this proof tooling (RESEARCH.md's Pitfall 3 explicitly anticipated a genuinely broken down migration surfacing here). No scope creep — both fixes stay within Task 2's file set (plus the one migration file the failure pointed at) and are fully documented for Plan 134-05, which will run a full reset against the shared database using this now-corrected migration chain.

## Issues Encountered
None beyond the two deviations above, both resolved within Task 2's normal fix-attempt budget.

## User Setup Required

None - `TEAM4S_PHASE134_MIGRATION_DSN` is set explicitly per test invocation (matches the phase128/phase106 convention) and does not require any persistent `.env` change; it was supplied inline for verification against the existing `team4sv30-db` compose service.

## Next Phase Readiness
- The full 145-pair migration chain is now proven fresh/Up/Down-reversible on a dedicated ephemeral database, never touching `team4s_v2`.
- Migration 0037's down.sql is now a real rollback, closing a latent gap that would otherwise have surfaced again (or worse, silently corrupted state) whenever Plan 134-05's rollout reset exercises a full Down/Up cycle against the shared database.
- No blockers for downstream Phase 134 waves.

---
*Phase: 134-fixture-backed-verification-rollout*
*Completed: 2026-08-16*

## Self-Check: PASSED

All 3 created/modified source files confirmed on disk; all 3 commits (`784f373d`, `ce822772`, `87523dee`) confirmed in `git log`.
