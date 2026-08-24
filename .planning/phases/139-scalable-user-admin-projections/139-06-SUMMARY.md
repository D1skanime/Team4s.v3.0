---
phase: 139-scalable-user-admin-projections
plan: 06
subsystem: testing
tags: [postgres, pgx, query-budget, pagination, seed-script, node]

# Dependency graph
requires:
  - phase: 139-03
    provides: ListUserContributions (grouped/paginated, override-diff) and its seed-helper conventions
  - phase: 139-04
    provides: GetUserMedia (grouped/paginated, real PublicURL/FileSizeBytes) and its seed-helper conventions
  - phase: 139-05
    provides: GetUserRightsSummary (batched F-01 rights summary) and rightsSummaryFakeResolver
provides:
  - Constant-query-budget gate (QUAL-06/D25) proving all three Phase-139 endpoints issue a fixed,
    volume-independent SQL round-trip count (few-vs-many fixture, pinned exact constants)
  - Pagination-drift-at-scale gate (D24) proving filters/counts/items derive from the same
    server-side filtered/grouped dataset across a 30-block, 6-page walk, with and without an
    active filter, for contributions and media
  - Real independent-but-identical and independent-and-different release_crew_snapshots rows in
    the live team4s_v2 database, produced via the real PUT contributions/effective endpoint
    (F-03), with an idempotent, reusable seed script to reproduce them
affects: [139-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "openPhase139PostgresWithCounter: package-local duplication of testsupport.OpenPhase139Postgres's isolated-schema + full-migration-chain connection logic, with a pgx.QueryTracer wired onto pgxpool.Config.ConnConfig BEFORE the scoped pool opens -- mirrors openPhase131Postgres's identical, already-accepted duplication for the same structural reason (testsupport exposes no Tracer injection seam)"
    - "Fake in-memory batch resolver (rightsSummaryFakeResolver, reused from 139-05's own test file) used to measure GetUserRightsSummary's OWN SQL round-trips in isolation from the permissions-resolution engine's internals, which are proven separately"
    - "F-03 idempotent seed script: read-only discovery across real admin list endpoints (no new endpoint) + re-read-before-write comparison keyed on BOTH snapshot_mode AND a set-equal crew comparison, since an 'inherited' row whose content happens to equal the desired crew is NOT yet in the target 'independent' state and must still be written once"

key-files:
  created:
    - backend/internal/repository/admin_users_query_budget_test.go
    - scripts/seed-phase139-contribution-fixtures.mjs
  modified:
    - scripts/README-seed.md

key-decisions:
  - "Constants pinned from real observed values (not the plan's placeholder guesses): phase139ContributionsQueryBudget=3, phase139MediaQueryBudget=2, phase139RightsSummaryQueryBudget=5 -- each verified equal for a 2-block/group vs 20-block/group fixture against the real TEAM4S_PHASE139_TEST_DSN fixture."
  - "GetUserRightsSummary's query-budget test uses a fake, zero-SQL-cost AdminUsersRightsBatchResolver (reused from 139-05's rightsSummaryFakeResolver) so the counted query budget reflects ONLY listUserRightsSummary's own round-trips (paginated memberships + actor + open-claims + action labels + role labels); the resolver's own exactly-once-per-load call property is proven separately and already pinned by 139-05's TestGetUserRightsSummaryBatchesAcrossGroups, and is additionally re-asserted here (resolver.calls == 1) as a belt-and-suspenders check."
  - "F-03 seed script's idempotency check compares BOTH snapshot_mode=='independent' AND crew-set equality before skipping a PUT -- an initial implementation that compared crew content only produced a real bug (found live): a release version whose SeedInheritedInTx-created 'inherited' snapshot already happened to equal the project standard was incorrectly treated as already in the F-03 target state and never got PUT, leaving it 'inherited' forever. Fixed before the first live run completed successfully."
  - "F-03 seed script's default admin account (admin@team4s.de/123) intentionally differs from seed-member-profile-fixtures.mjs's default (csubs-leader@team4s.local) -- this live environment's team4s_v2 database does not contain the sheppert/csubs-leader fixture profiles (confirmed via direct query), so the script's discovery logic falls through its generic-scan path and its default credentials point at the actual platform_admin account present in this environment (admin@team4s.de, app_user id 1)."

requirements-completed: [QUAL-06]

# Metrics
duration: ~55min
completed: 2026-08-24
---

# Phase 139 Plan 06: QUAL-06 Query-Budget/Pagination-Drift Gates + F-03 Live Demo Data Summary

**Pinned constant-query-budget proofs (3/2/5 SQL round-trips, few-vs-many, for contributions/media/rights-summary) plus a 30-block/6-page pagination-drift walk with and without an active filter (D24), and a live, idempotent seed script that turned team4s_v2's release_crew_snapshots from 0 to 2 real `independent` rows (one identical, one genuinely differing) via the real crew-override PUT endpoint — closing F-03's "no live UAT data" gap.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-24T18:45:00Z (approx, after context/code investigation)
- **Completed:** 2026-08-24T19:41:00Z
- **Tasks:** 3/3 complete
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `openPhase139PostgresWithCounter` — a package-local (repository package) disposable-Postgres
  opener that duplicates `testsupport.OpenPhase139Postgres`'s isolated-schema + full-real-
  migration-chain logic, but wires a `queryCounter` (`pgx.QueryTracer`) onto the pool's
  `ConnConfig` before the scoped pool opens — the exact seam `testsupport.OpenPhase139Postgres`
  does not expose, mirroring `openPhase131Postgres`'s already-accepted identical duplication.
- Three constant-query-budget tests (`TestPhase139ContributionsQueryBudgetIsConstant`,
  `TestPhase139MediaQueryBudgetIsConstant`, `TestPhase139RightsSummaryQueryBudgetIsConstant`),
  each seeding a 2-vs-20-block/group fixture (including a real deviation/override), resetting the
  counter, calling the endpoint, and asserting `require.Equal(fewCount, manyCount)` plus a pinned
  exact constant — verified live against `TEAM4S_PHASE139_TEST_DSN`:
  contributions=3, media=2, rights-summary=5 queries, identical for both few and many.
- Two pagination-drift-at-scale tests (`TestPhase139ContributionsPaginationDriftAtScale`,
  `TestPhase139MediaPaginationDriftAtScale`), each seeding 30 blocks and walking 6 pages of
  `limit=5`, proving zero duplicate/missing grouping keys and `Meta.Total` coherence with the
  returned items, both unfiltered and with an active filter (`only_deviations`/`media_type`) —
  proving D24 (filters, counts, and items all derive from the exact same server-side
  filtered/grouped dataset).
- `scripts/seed-phase139-contribution-fixtures.mjs` — a new, zero-npm-dependency, idempotent
  Node seed script mirroring `seed-member-profile-fixtures.mjs`'s exact conventions. It discovers
  a real anime+fansub-group pair with a project-standard row and ≥2 release versions (via
  existing read-only admin list endpoints, preferring the `seed129-group-a` fixture if present),
  then calls the real `PUT /api/v1/admin/release-versions/:versionId/contributions/effective`
  endpoint twice: once with a crew payload set-equal to the project standard
  (independent-but-identical) and once with a genuinely different payload
  (independent-and-different).
- Ran the script live against the real stack twice: the first run discovered fansub group
  "New-Subs" (id=1) / anime "Buddy Complex" (id=1), found a **real bug** in the idempotency check
  (see Deviations), fixed it, then re-ran successfully producing `RESULT: PASS` (2/2 checks). A
  second run confirmed idempotency — both PUTs skipped, still `RESULT: PASS`.
- Confirmed directly against `team4s_v2`: `release_crew_snapshots` now has 2 `independent` rows
  (0 before this plan) — release_version_id=1 (`{typesetter,encoder,karaoke_fx}`, set-equal to the
  project standard) and release_version_id=2 (`{typesetter,encoder,karaoke_fx,translator}`,
  genuinely differing) — exactly the pair 139-10's live UAT of "Nur Abweichungen" needs.
- Full scoped regression (`go build ./...`, `go vet ./...`, `go test ./internal/repository/...
  ./internal/handlers/...`): exactly 60 pre-existing failures, matching `139-BASELINE.md`'s
  documented baseline exactly — zero new failures in any file this plan touches.

## Task Commits

1. **Task 1: Query-count-is-constant gate for contributions/media/rights-summary** - `9643e2ce` (test)
2. **Task 2: Pagination-drift test (D24 coherence at scale)** - `8a4de412` (test)
3. **Task 3: F-03 seed script — real independent-identical + independent-different demo data** - `86684889` (feat)

**Plan metadata:** this commit (docs: complete plan, includes SUMMARY.md/STATE.md/ROADMAP.md)

## Files Created/Modified

- `backend/internal/repository/admin_users_query_budget_test.go` - New file: `openPhase139PostgresWithCounter` harness, 3 constant-query-budget tests (Task 1), 2 pagination-drift-at-scale tests (Task 2)
- `scripts/seed-phase139-contribution-fixtures.mjs` - New F-03 idempotent, API-driven seed script
- `scripts/README-seed.md` - New section documenting the F-03 script's purpose, run command, and env vars

## Decisions Made

- Pinned the three query-budget constants from real observed values against the live disposable
  Phase-139 Postgres fixture (contributions=3, media=2, rights-summary=5), not the plan's
  interface-block placeholder shape.
- The rights-summary budget test uses a fake, zero-SQL-cost batch resolver (reused from 139-05)
  so it measures only `listUserRightsSummary`'s own round-trips; the resolver's own
  exactly-once-call property is proven separately (139-05) and cross-checked here again.
- F-03 seed script's idempotency check requires BOTH `snapshot_mode=='independent'` AND
  crew-set equality before skipping a write — see Deviations for the real bug this caught.
- F-03 seed script defaults to `admin@team4s.de`/`123` (this environment's actual
  `platform_admin`), not `seed-member-profile-fixtures.mjs`'s `csubs-leader@team4s.local`
  default, since that fixture profile does not exist in this environment's `team4s_v2`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] F-03 seed script's idempotency check incorrectly skipped a required PUT on an "already content-matching but still inherited" release version**
- **Found during:** Task 3, first live run against the real stack
- **Issue:** `ensureEffectiveCrewMatches` originally compared only the crew-set content
  (member_id + role_codes) between the current effective crew and the desired target, ignoring
  `snapshot_mode`. Release version 1's `SeedInheritedInTx`-created `inherited` snapshot already
  happened to equal the project standard content-wise, so the check incorrectly treated it as
  "already matching the desired state" and skipped the PUT — leaving it `inherited` forever
  instead of reaching the F-03 target `independent` state. The live run's own verification step
  caught this immediately (`snapshot_mode=inherited` where `independent` was expected).
- **Fix:** `ensureEffectiveCrewMatches` now requires BOTH `current.snapshotMode === 'independent'`
  AND crew-set equality before skipping the PUT; an `inherited` row is always written at least
  once regardless of whether its inherited content already happens to match the target.
- **Files modified:** `scripts/seed-phase139-contribution-fixtures.mjs`
- **Verification:** Re-ran live; both checks now report `PASS` (`snapshot_mode=independent` for
  both release versions), and a second re-run confirms idempotency (both PUTs skipped, still
  `RESULT: PASS`). Confirmed directly in `team4s_v2` via `psql`: 2 `independent` rows, one
  set-equal to project standard, one genuinely differing.
- **Committed in:** `86684889` (Task 3 commit — the bug was found and fixed before committing,
  so the committed script already contains the fix; no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed bug (found and fixed before the affected file was committed).
**Impact on plan:** Necessary for the plan's own stated `done` criterion (a real
independent-and-different row that did not exist before this plan) to actually hold true after a
real live run. No scope creep — no additional functionality was added beyond what F-03 requires.

## Issues Encountered

- This live environment's `team4s_v2` database does not contain the `seed129-group-a` /
  `csubs-leader`/`sheppert` fixture data `seed-member-profile-fixtures.mjs` establishes elsewhere
  (confirmed via direct `psql` query: 1 real fansub group "New-Subs", 1 real anime "Buddy
  Complex", 13 real release versions) — the seed script's generic-discovery fallback path (not
  the preferred-fixture path) is what actually ran and succeeded live. This is expected per the
  plan's own instruction ("preferring the sheppert/csubs-leader fixture data ... if a suitable
  pair exists there, otherwise the first suitable real pair found") and is documented in the
  script itself, not a defect.

## User Setup Required

None — the disposable `TEAM4S_PHASE139_TEST_DSN` Postgres fixture and the live Docker Compose
stack were both already running and reachable; no external service configuration was required.

## Next Phase Readiness

- QUAL-06's constant-query-budget and pagination-drift properties are now proven for all three
  Phase-139 endpoints together, closing the phase-wide quality gate 139-03/139-04/139-05
  individually could not close on their own.
- `release_crew_snapshots` in the live `team4s_v2` database now has real, concrete
  independent-identical and independent-different rows (fansub group "New-Subs" id=1, anime
  "Buddy Complex" id=1, release_version_id 1 and 2 respectively) — 139-10's live UAT of the "Nur
  Abweichungen" filter has real data to click through instead of an empty result set.
- No blockers for the remaining Phase-139 plans (139-07/08/09 frontend tab rewrites, 139-10 live
  UAT).

---
*Phase: 139-scalable-user-admin-projections*
*Completed: 2026-08-24*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/admin_users_query_budget_test.go`
- FOUND: `scripts/seed-phase139-contribution-fixtures.mjs`
- FOUND: `.planning/phases/139-scalable-user-admin-projections/139-06-SUMMARY.md`
- FOUND: commit `9643e2ce` in `git log`
- FOUND: commit `8a4de412` in `git log`
- FOUND: commit `86684889` in `git log`
- FOUND: `go build ./...` / `go vet ./...` clean
- FOUND: `go test ./internal/repository/... ./internal/handlers/...` FAIL count = 60, matches 139-BASELINE.md documented baseline exactly
- FOUND: `release_crew_snapshots` in live `team4s_v2` has 2 `independent` rows (0 before this plan), confirmed via direct `psql` query
