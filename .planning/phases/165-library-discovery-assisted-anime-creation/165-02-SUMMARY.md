---
phase: 165-library-discovery-assisted-anime-creation
plan: 02
subsystem: database
tags: [postgres, pgx, migration, repository, tdd]

# Dependency graph
requires: []
provides:
  - "library_discovery_ignored_items table (additive, server_key-keyed, D-17/D-22)"
  - "LibraryDiscoveryIgnoreRepository: InsertLibraryDiscoveryIgnore / RemoveLibraryDiscoveryIgnore / FindIgnoredLibraryDiscoveryItems"
affects: [165-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-query batch lookup via ANY($1::text[]) matching FindExistingAnimeByJellyfinIntakeRefs's discipline"
    - "DB-level DEFAULT column (server_key) omitted from INSERT column list so the constant fires server-side, proven by a dedicated test, not assumed"
    - "queryCounter (pgx.QueryTracer) reused to assert constant query cost as input scales"

key-files:
  created:
    - database/migrations/0170_library_discovery_ignored_items.up.sql
    - database/migrations/0170_library_discovery_ignored_items.down.sql
    - backend/internal/repository/library_discovery_ignored_items.go
    - backend/internal/repository/library_discovery_ignored_items_test.go
  modified: []

key-decisions:
  - "InsertLibraryDiscoveryIgnore signature implemented as (ctx, itemID string, actorAppUserID *int64) error, not the plan text's literal '(ctx, animeRepo interface, itemID string, actorAppUserID *int64)' -- the plan's own <behavior> test spec and INSERT/ON-CONFLICT action description never reference an animeRepo parameter, so the extra parameter was treated as a plan-text artifact rather than an intentional interface."
  - "Created a dedicated LibraryDiscoveryIgnoreRepository struct (own *pgxpool.Pool field) rather than adding methods to AdminContentRepository, matching the repo layer's domain-split convention (CLAUDE.md: 'Repositories are split by domain and instantiated with shared DB pool handles')."
  - "Provisioned team4s_library_discovery_test as a new disposable Postgres database (full real migration chain applied, matching team4s_episode_metadata_test's persistent-DB convention) since no such database existed yet."

requirements-completed: [REQ-165-16, REQ-165-21]

duration: 25min
completed: 2026-09-21
---

# Phase 165 Plan 02: Library Discovery Ignore Storage Summary

**Additive `library_discovery_ignored_items` table plus a repository (insert/delete/single-query batch lookup) for reversibly ignoring Jellyfin library items on the admin Discovery page, applied and verified against team4s_v2.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-21T13:33:00Z
- **Completed:** 2026-09-21T13:44:13Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 new SQL files, 1 new Go file, 1 new Go test file)

## Accomplishments
- `library_discovery_ignored_items` migration (0170) applied to `team4s_v2` and verified reversible via a live up/down/up cycle
- `LibraryDiscoveryIgnoreRepository` with idempotent insert, idempotent delete, and a single-query batch lookup (`ANY($1::text[])`), proven constant-cost as input scales via a `queryCounter`-based test
- `server_key` DB-level `DEFAULT 'default'` proven to fire server-side (not a Go-side default) via a dedicated test that inserts without specifying the column
- Full RED→GREEN TDD cycle: test commit fails to compile without the implementation, then implementation commit turns all 7 tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0170 — library_discovery_ignored_items** - `40de04e6` (feat)
2. **Task 2: Repository — insert/delete/batch-lookup** - `fa162057` (test, RED) → `5f2b6d61` (feat, GREEN)

**Plan metadata:** (this commit, docs: complete plan)

_TDD task produced 2 commits (test → feat); no refactor commit was needed._

## Files Created/Modified
- `database/migrations/0170_library_discovery_ignored_items.up.sql` - Additive table + unique index (server_key, jellyfin_item_id)
- `database/migrations/0170_library_discovery_ignored_items.down.sql` - Reverses the up migration (index then table)
- `backend/internal/repository/library_discovery_ignored_items.go` - `LibraryDiscoveryIgnoreRepository` with Insert/Remove/FindIgnored
- `backend/internal/repository/library_discovery_ignored_items_test.go` - 7 Postgres-integration tests, DSN-gated via `TEAM4S_LIBRARY_DISCOVERY_TEST_DSN`

## Decisions Made
- Treated the plan's literal `InsertLibraryDiscoveryIgnore(ctx, animeRepo interface, itemID string, actorAppUserID *int64)` signature text as a copy/paste artifact — the plan's own `<behavior>` test spec (Test 1, idempotent insert) and `<action>` text (plain `INSERT ... ON CONFLICT`) never reference or use an `animeRepo` parameter. Implemented `InsertLibraryDiscoveryIgnore(ctx, itemID string, actorAppUserID *int64) error` instead, matching every other reference to this function in the plan.
- Added the three functions as methods on a new `LibraryDiscoveryIgnoreRepository` struct (own pool handle) rather than as additional methods on `AdminContentRepository`, consistent with the repo layer's domain-split convention and this plan's Wave-1/no-HTTP-surface scope (165-06 will compose it).
- Created `team4s_library_discovery_test` as a new disposable database with the full real migration chain applied (mirroring `team4s_episode_metadata_test`'s persistent-DB pattern from the plan's own interfaces section) since it did not previously exist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed inconsistent-type SQL error in the app_users test fixture helper**
- **Found during:** Task 2 GREEN run (`TestLibraryDiscoveryIgnoredItems_ActorAppUserIDIsStoredVerbatim`)
- **Issue:** `seedLibraryDiscoveryTestAppUser`'s INSERT reused `$1` untyped across `email = $1 || '@example.invalid'` and `display_name = $1`, producing Postgres error `inconsistent types deduced for parameter $1 (SQLSTATE 42P08)`.
- **Fix:** Added explicit `::text` casts to all three `$1` usages in the INSERT statement.
- **Files modified:** `backend/internal/repository/library_discovery_ignored_items_test.go`
- **Verification:** Full GREEN test run passes (all 7 tests) after the fix.
- **Committed in:** `5f2b6d61` (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Deviated from the plan's literal InsertLibraryDiscoveryIgnore parameter list**
- **Found during:** Task 2 planning read (before writing tests)
- **Issue:** The plan's `<action>` text specifies `InsertLibraryDiscoveryIgnore(ctx, animeRepo interface, itemID string, actorAppUserID *int64) error`, but no other part of the plan (behavior tests, threat model, interfaces) references an `animeRepo` argument, and the described SQL action is a plain single-row `INSERT ... ON CONFLICT DO NOTHING` with no need for an anime repository dependency.
- **Fix:** Implemented the function without the `animeRepo` parameter: `InsertLibraryDiscoveryIgnore(ctx, itemID string, actorAppUserID *int64) error`.
- **Files modified:** `backend/internal/repository/library_discovery_ignored_items.go`
- **Verification:** Matches Test 1's idempotent-insert behavior exactly; `go build ./...` succeeds; all tests pass.
- **Committed in:** `5f2b6d61` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking/plan-text ambiguity)
**Impact on plan:** Both fixes were necessary to make the plan's own behavior spec compile and pass. No scope creep — no new HTTP surface, no schema changes beyond migration 0170.

## Issues Encountered
- The `team4sv30-backend` container has no live bind mount for `backend/internal/**` Go source (only `database/migrations` is live-mounted read-only), so `docker compose exec team4sv30-backend go build ...` silently built against a 3-day-old image copy that didn't even contain the new files. Verification was instead done via a throwaway `golang:1.25-alpine` container bind-mounting the host `backend/` directory (per this plan's operational notes), connected to the `team4s_default` Docker network to reach `team4sv30-db`.
- No `team4s_library_discovery_test` database existed yet; created it (`CREATE DATABASE ... OWNER team4s`) and applied the full migration chain (170 migrations) via the standard `cmd/migrate` tool before running tests.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `library_discovery_ignored_items` table live on `team4s_v2`; `LibraryDiscoveryIgnoreRepository` ready to be composed by 165-06's Discovery list + ignore/unignore handlers (Wave 4).
- The running `team4sv30-backend` container was intentionally NOT rebuilt/redeployed — this plan adds no HTTP surface (per its own threat model: "No HTTP endpoint exists yet in this plan"), and the repository code is not yet referenced from `cmd/server/main.go`. A rebuild will naturally happen when 165-06 wires this repository into a handler.
- `team4s_library_discovery_test` (disposable Postgres DB, full migration chain applied) is available for future test runs via `TEAM4S_LIBRARY_DISCOVERY_TEST_DSN`.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

## Self-Check: PASSED
All created files found on disk; all 3 task commits (40de04e6, fa162057, 5f2b6d61) found in git log.
