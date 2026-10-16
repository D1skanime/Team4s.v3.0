---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 02
subsystem: testing
tags: [postgres, pgx, unaccent, text-search, migrations, test-fixtures]

requires:
  - phase: 185-01
    provides: Frontend contract-test fix (unrelated cluster, no shared files)
provides:
  - "Phase-139 fixture (testsupport.OpenPhase139Postgres) runs the full migration chain clean, including migration 0152's public.unaccent dependency"
  - "Phase-167 fixture (testsupport.OpenPhase167Postgres) resolves its local f_unaccent wrapper's public.unaccent dependency"
  - "Reusable widen-then-narrow search_path pattern for running unqualified-then-qualified unaccent lookups inside a schema-isolated test connection, without weakening the shared openPhasePostgres safety guard"
affects: [185-03, 185-04, backend-testsupport, backend-repository-tests]

tech-stack:
  added: []
  patterns:
    - "Schema-isolated PostgreSQL test fixtures that replay real migrations needing public.unaccent: create the extension schema-qualified in public, temporarily widen search_path to [isolated schema, public] for the duration of the migration/DDL run only (new unqualified objects still land in the isolated schema since it stays first), then narrow back to the isolated schema before returning control to the test."

key-files:
  created: []
  modified:
    - backend/internal/testsupport/phase139_postgres.go
    - backend/internal/testsupport/phase167_postgres.go
    - backend/internal/repository/admin_users_query_budget_test.go

key-decisions:
  - "The plan's literal one-line fix (add CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public before runner.Up()) was insufficient for Phase-139: migration 0140's own f_unaccent definition calls unaccent(...) UNQUALIFIED, and CREATE FUNCTION/CREATE INDEX eagerly resolve that name at DDL time. Moving the extension into public alone breaks 0140 while fixing 0152. Fix: create the extension in public, then widen search_path to [isolated schema, public] only around the migration run, narrowing back immediately after -- both migrations resolve, and the safety guard is intact for every query after fixture setup completes."
  - "Phase-167 needed no search_path widening: its local f_unaccent wrapper is byte-identical to migration 0152's already-qualified version, so a single CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public before the wrapper is created was sufficient."
  - "Rule 3 (auto-fix blocking issue): admin_users_query_budget_test.go's openPhase139PostgresWithCounter intentionally duplicates testsupport.OpenPhase139Postgres's setup (documented in its own file header, mirroring an existing Phase-131 pattern) because it wires a query-counting pgx.QueryTracer before the pool opens. This duplicate was not in the plan's files_modified list but needed the identical fix to make TestPhase139ContributionsQueryBudgetIsConstant (explicitly named in the plan's own Task 1 verify command) pass."

patterns-established:
  - "When a schema-isolated migration-replay fixture needs both an unqualified and a schema-qualified lookup of the same extension-provided name across the chain, widen-then-narrow search_path around just the migration run instead of relaxing the fixture's baseline safety invariant."

requirements-completed: [D-02]

duration: 25min
completed: 2026-10-16
---

# Phase 185 Plan 02: Fix public.unaccent search_path conflict in Phase-139/167 test fixtures Summary

**Phase-139 and Phase-167 backend test fixtures now create `public.unaccent` explicitly before the real/local unaccent dependency chain runs, unblocking the single largest Klasse-B cluster (44 tests) without touching migration 0152 or weakening the shared schema-isolation safety guard.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-16T19:48:00Z
- **Completed:** 2026-10-16T20:13:42Z
- **Tasks:** 2 (plus one Rule-3 auto-fix to a third file needed to satisfy Task 1's own verify command)
- **Files modified:** 3

## Accomplishments
- `createPhase139Prerequisites` (and its intentionally-duplicated counterpart in `admin_users_query_budget_test.go`) now create `public.unaccent` and run the real migration chain with a correctly scoped, temporarily widened search_path, so both migration 0140's unqualified `unaccent(...)` call and migration 0152's explicit `public.unaccent` lookup resolve.
- `createPhase167Prerequisites` now creates `public.unaccent` before its local `f_unaccent` wrapper, resolving the same dictionary lookup with a single explicit statement (no widening needed, since the wrapper is already schema-qualified).
- Verified against real throwaway `team4s_phase139_test_*` / `team4s_phase167_test_*` databases (never `team4s_v2`): all named tests in both Task verify commands pass, plus the full Phase-139/Phase-167 test file sets (24 total test functions across both fixtures, including the query-budget and pagination-drift tests).
- `go build ./...` and `go vet ./...` clean across the whole backend module.

## Task Commits

Each task was committed atomically:

1. **Task 1: Phase-139 fixture — create public.unaccent before the real migration chain runs** - `632915494` (fix) — includes the Rule-3 auto-fix to `admin_users_query_budget_test.go`'s duplicated fixture setup, required to make `TestPhase139ContributionsQueryBudgetIsConstant` (named in Task 1's own verify command) pass.
2. **Task 2: Phase-167 fixture — create public.unaccent before the local f_unaccent wrapper** - `39f86c9c1` (fix)

**Plan metadata:** (this commit, created after this SUMMARY)

## Files Created/Modified
- `backend/internal/testsupport/phase139_postgres.go` - `createPhase139Prerequisites` creates `public.unaccent`, widens search_path to `[isolated schema, public]` around `runner.Up()`, narrows back afterward; new helper `currentPhase139Schema` reads back the isolated schema name.
- `backend/internal/testsupport/phase167_postgres.go` - `createPhase167Prerequisites` creates `public.unaccent` before the existing SQL block (tables + local `f_unaccent` wrapper); corrected the now-inaccurate doc comment that claimed the extension was "created once per-database already by prior migrations".
- `backend/internal/repository/admin_users_query_budget_test.go` - `openPhase139PostgresWithCounter` (a documented, intentional duplicate of `testsupport.OpenPhase139Postgres`'s setup, needed to wire a query-counting tracer before pool creation) gets the identical public.unaccent + widen/narrow fix.

## Decisions Made
- **Widen-then-narrow search_path, not a bare CREATE EXTENSION.** Empirically verified via manual `psql` experiments (scratch throwaway databases) that creating the extension only in `public` breaks migration 0140's own unqualified `unaccent(...)` call (`CREATE FUNCTION`/`CREATE INDEX` eagerly resolve unqualified names via `check_function_bodies` and index-expression planning, respectively — not deferred to call time). Creating it only in the isolated schema (the pre-existing behavior) leaves `public.unaccent` missing for migration 0152. Both migrations need to resolve from the *same* fixture connection, so the extension is installed in `public`, and the connection's `search_path` is widened to `[isolated schema, public]` for exactly the duration of the migration run, then narrowed back to the isolated schema only — preserving the invariant that every query the test issues afterward sees an isolated, `public`-free `search_path`.
- **No widening needed for Phase-167.** Its local `f_unaccent` wrapper already calls `public.unaccent(...)` explicitly (byte-identical to migration 0152), so creating the extension in `public` is the complete fix — confirmed by running the Task 2 verify command unmodified before writing any widen/narrow logic for that file.
- **Extended the fix to `admin_users_query_budget_test.go` (Rule 3 — auto-fix blocking issue).** This file was not in the plan's declared `files_modified`, but its `openPhase139PostgresWithCounter` function duplicates the exact same real-migration-chain setup that Task 1 fixes in `testsupport`, and one of its tests (`TestPhase139ContributionsQueryBudgetIsConstant`) is explicitly named in Task 1's own `<verify>` command. Without this fix, that test fails identically ("function unaccent(unknown, text) does not exist"), so Task 1's stated verification could not pass without it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan's literal one-statement fix was insufficient for Task 1; extended with widen/narrow search_path**
- **Found during:** Task 1 (Phase-139 fixture)
- **Issue:** Adding only `CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public` before `runner.Up()` (exactly as the plan's `<action>` describes) moves the error from migration 0152 ("text search dictionary public.unaccent does not exist") to migration 0140 ("function unaccent(unknown, text) does not exist"), because 0140's own `f_unaccent` definition and its functional GIN-trigram index use an UNQUALIFIED `unaccent(...)` call that `check_function_bodies`/index-expression planning resolve eagerly against the connection's `search_path` — which, once the extension moves to `public`, no longer contains a schema with `unaccent` in it.
- **Fix:** After creating the extension in `public`, temporarily widen the connection's `search_path` to `[isolated schema, public]` for the duration of the migration run (new unqualified `CREATE TABLE`/`INDEX`/`FUNCTION` statements still target the isolated schema, since it stays first in the list), then narrow back to the isolated schema immediately after `runner.Up()` returns, before the pool is handed back to the test.
- **Files modified:** `backend/internal/testsupport/phase139_postgres.go`
- **Verification:** Manual `psql` experiments against throwaway scratch databases confirmed the exact failure mode and the fix's correctness before touching Go code; then `TEAM4S_PHASE139_TEST_DSN` pointed at a fresh `team4s_phase139_test_*` database, ran the plan's own Task 1 verify command (4/4 tests pass) plus the full Phase-139 test-file set (12/12 pass, including pagination-drift and query-budget tests).
- **Committed in:** `632915494` (Task 1 commit)

**2. [Rule 3 - Blocking] Duplicated Phase-139 fixture setup in a test file outside the plan's declared scope needed the identical fix**
- **Found during:** Task 1 verification (running the plan's own verify command surfaced this failure)
- **Issue:** `admin_users_query_budget_test.go`'s `openPhase139PostgresWithCounter` duplicates `testsupport.OpenPhase139Postgres`'s isolated-schema + full-migration-chain setup locally (an existing, documented pattern mirroring Phase-131's `openPhase131Postgres`, needed because a query-counting tracer must be wired onto `pgxpool.Config` before the pool opens). `TestPhase139ContributionsQueryBudgetIsConstant`, explicitly named in Task 1's `<verify>` command, failed with the same unqualified-`unaccent` error as above.
- **Fix:** Applied the identical create-extension + widen/narrow-search_path fix to this duplicated setup function.
- **Files modified:** `backend/internal/repository/admin_users_query_budget_test.go`
- **Verification:** `TestPhase139ContributionsQueryBudgetIsConstant`, `TestPhase139MediaQueryBudgetIsConstant`, `TestPhase139RightsSummaryQueryBudgetIsConstant`, `TestPhase139ContributionsPaginationDriftAtScale`, and `TestPhase139MediaPaginationDriftAtScale` all pass against a fresh throwaway database.
- **Committed in:** `632915494` (same commit as Task 1, same root cause)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues preventing the plan's own stated verification from passing)
**Impact on plan:** Both auto-fixes were necessary to make the plan's explicitly named verify/done criteria actually pass. No scope creep beyond that: migration 0152 was not touched, and `openPhasePostgres`'s shared `search_path` safety check (`containsString(schemas, "public")` must be false) was not modified anywhere — the widen/narrow logic lives entirely inside the three fixture-setup functions and is reverted before each function returns.

## Issues Encountered
- The plan's `<interfaces>` section correctly diagnosed the root cause (migration 0152's hard-coded `public.unaccent` lookup vs. the fixture's `public`-free `search_path`) but its proposed one-statement fix did not account for migration 0140's own unqualified `unaccent(...)` call being eagerly resolved at DDL time (not deferred to row-insert time). This was discovered empirically by running the plan's own verify command, not by static reading alone — confirmed via isolated `psql` experiments against scratch throwaway databases before writing any Go code, to pin down the exact mechanism (CREATE FUNCTION's `check_function_bodies` validation and CREATE INDEX's expression-planning inlining both resolve unqualified function names against the live `search_path`, not against where the extension physically lives).

## User Setup Required

None - no external service configuration required. All verification ran against throwaway `team4s_phase139_test_*`/`team4s_phase167_test_*` databases, created and dropped by this session; `team4s_v2` was never touched.

## Next Phase Readiness
- The 44-test `public.unaccent` cluster (largest single root cause in the 185-CONTEXT.md Ist-Stand analysis) is fully resolved: all Phase-139-fixture-consuming tests (12 test functions, including budget/pagination-drift variants beyond the plan's named 4) and all Phase-167-fixture-consuming tests (24 test functions across 5 files) pass against fresh throwaway databases.
- The widen-then-narrow `search_path` pattern established here is reusable for any future fixture needing both unqualified and `public`-qualified resolution of the same extension-provided name without relaxing `openPhasePostgres`'s safety invariant.
- No blockers for 185-03/185-04; this plan's files (`phase139_postgres.go`, `phase167_postgres.go`, `admin_users_query_budget_test.go`) are isolated to the backend test-support/test layer and do not touch any production code path or migration.

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*
