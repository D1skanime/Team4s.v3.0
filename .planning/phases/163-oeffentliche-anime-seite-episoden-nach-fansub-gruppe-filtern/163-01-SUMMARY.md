---
phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
plan: 01
subsystem: testing
tags: [go, postgres, tdd-red, episodes, fansub-groups, pagination]

# Dependency graph
requires: []
provides:
  - "Corrected RED baseline in episode_version_public_integration_test.go (neutral-row bug expectations replaced with post-fix expectations)"
  - "New episode_version_public_group_filter_test.go covering Pflichtfälle B, C, D, E, F, I and an updated J query-budget helper"
  - "Documented pre-fix go test ./... baseline and live EXPLAIN (ANALYZE, BUFFERS) before-numbers for Naruto anime_id=4 in team4s_v2"
affects: [163-02, 163-03, 163-04, 163-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling Postgres-integration test file reusing another file's package-scoped tracer/request helpers without duplication (episode_version_public_group_filter_test.go reuses episodePublicTracer/episodePublicRequest from episode_version_public_integration_test.go)"
    - "TDD RED baseline: correcting existing bug-encoding assertions to the target (fixed) behavior before touching production code, confirmed failing for the documented reason"

key-files:
  created:
    - backend/internal/repository/episode_version_public_group_filter_test.go
    - .planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/deferred-items.md
  modified:
    - backend/internal/repository/episode_version_public_integration_test.go

key-decisions:
  - "Pflichtfall F (pagination-scope leak) uses a dedicated anime (id=8, 29 padding episodes + 1 sole group-4 match at episode 30) rather than reusing anime 7's episodes 1-5, because anime 7 already has episodes 3/4 in group 4 — reusing it would make episode 3, not 30, the first group-4 match under limit=1, which would not prove the pagination-scope claim unambiguously."
  - "RESEARCH.md's claim that an unrecognized fansub query parameter is 400-rejected by parseStrictNamedQuery's 'unknown-key rejection' is inaccurate: parseStrictNamedQuery (episode_version_grants.go) silently ignores any key not in its allowlist rather than erroring. All 6 new group-filter tests still fail today (RED) for the documented reason (wrong episode set / wrong status code from the missing filter feature), just via a slightly different mechanism than RESEARCH.md assumed — no test logic needed correction, only this note."
  - "Reused the already-running team4sv30-backend container (Go 1.25.13, on the team4s_default network) for go build/vet/test via docker cp + docker exec, instead of spinning up a fresh golang:1.25-alpine container, because the backend container already has the correct Go toolchain, module cache, and network access to team4sv30-db, and this matches established project precedent (260915-m2h, 260916-ako). A dedicated isolated test database (team4s_phase117_test_163, matching the code's required ^team4s_phase117_test_[a-z0-9]+$ naming pattern) was created on the same Postgres server as team4s_v2 but is a completely separate database — team4s_v2 itself was touched only by read-only SELECT/EXPLAIN statements."

requirements-completed: [REQ-163-15, REQ-163-17, REQ-163-24]

duration: 55min
completed: 2026-09-17
---

# Phase 163 Plan 01: Backend RED-Test Baseline Summary

**Established the failing-test baseline for Phase 163 — corrected three existing assertions that encoded the neutral-row bug, added a new sibling fixture covering Pflichtfälle B/C/D/E/F/I/J, and captured a pre-fix `go test ./...` + live read-only `EXPLAIN` baseline — with zero production code touched.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-17T16:33:00Z (approx, first tool call)
- **Completed:** 2026-09-17
- **Tasks:** 3/3 completed
- **Files modified:** 2 (1 corrected, 1 new); 1 planning doc created (deferred-items.md)

## Accomplishments

- Captured and documented a full pre-fix `go test ./...` baseline (69 failing top-level test entries across 3 packages, `handlers`/`migrations`/`repository`) and a fresh, read-only live `EXPLAIN (ANALYZE, BUFFERS)` run against `team4s_v2` for Naruto (anime_id=4, unfiltered), confirming the exact "220-row inventory scan" neutral-row bug live in production data.
- Corrected the three existing assertions in `episode_version_public_integration_test.go` that previously asserted the *buggy* neutral-row behavior (episode counts 4→2, 126→125, 1→0), confirmed each now fails today against the unfixed `publicEpisodeQuery` for the documented reason.
- Added `episode_version_public_group_filter_test.go` (213 lines), a new isolated-schema Postgres fixture covering Pflichtfälle B, C, D (exclusive/coop group visibility), E (named Naruto-shaped regression), F (pagination-scope leak beyond page 1), I (group-less version fail-closed), and backend halves of G (cursor filter-scope) and H (unknown/foreign slug) — all 6 new test functions fail today for a documented reason.
- No production code (`episode_version_public_query.go`, handler, model, OpenAPI) was touched, per the plan's mandatory test-first ordering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture the pre-fix baseline** — no code commit (read-only capture; results recorded below). Verified via `test -s /tmp/163-pre-fix-baseline.txt`.
2. **Task 2: Correct the three existing baseline assertions (RED)** — `4e8be6d8` (test)
3. **Task 3: New sibling test file for Pflichtfälle B/C/D/E/F/I/J (RED)** — `a08a5f43` (test)

**Plan metadata commit:** recorded separately after this SUMMARY (see final commit).

## Files Created/Modified

- `backend/internal/repository/episode_version_public_integration_test.go` — three corrected assertions (neutral-row bug expectations → post-fix expectations); 355→343 lines.
- `backend/internal/repository/episode_version_public_group_filter_test.go` (new, 213 lines) — Pflichtfälle B/C/D/E/F/I/G(backend)/H(backend)/J coverage; reuses `episodePublicTracer`/`episodePublicRequest`/`publicEpisodeEnvelope`/`assertPublicBudget` from the sibling file (same package, no duplication).
- `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/deferred-items.md` (new) — logs out-of-scope pre-existing test failures found during the Task 1 baseline capture.

## Task 1: Pre-Fix Baseline (literal results)

### Go test suite baseline

Command run: `docker exec -e TEAM4S_PHASE117_TEST_DSN="postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_163?sslmode=disable" -w /app team4sv30-backend go test ./...` (only `TEAM4S_PHASE117_TEST_DSN` set — the DSN this phase's own tests use; a dedicated, disposable database `team4s_phase117_test_163` was created on `team4sv30-db` for this, matching the code's required `^team4s_phase117_test_[a-z0-9]+$` naming pattern — **never** `team4s_v2`).

Package-level result:
```
ok    team4s.v3/backend/cmd/server
ok    team4s.v3/backend/internal/auth
ok    team4s.v3/backend/internal/badges
ok    team4s.v3/backend/internal/config
FAIL  team4s.v3/backend/internal/handlers      9.655s
ok    team4s.v3/backend/internal/jellyfin
ok    team4s.v3/backend/internal/middleware
FAIL  team4s.v3/backend/internal/migrations    0.035s
ok    team4s.v3/backend/internal/models
ok    team4s.v3/backend/internal/observability
ok    team4s.v3/backend/internal/permissions
FAIL  team4s.v3/backend/internal/repository    16.394s
ok    team4s.v3/backend/internal/services
ok    team4s.v3/backend/internal/testquality
ok    team4s.v3/backend/internal/testsupport
```
69 top-level failing test entries total (full verbatim list also in `/tmp/163-pre-fix-baseline.txt`, not committed — ephemeral capture per this task's read-only remit).

**The one documented pre-existing failure** (per `STATE.md`): `TestFansubRepository_PublicProfileSourceInvariants` — present in this run's failures (string-based source-fragment check unrelated to Phase 163; pre-existing since before Plan 162-01 per `162-01-SUMMARY.md`'s own out-of-scope discovery).

**All other 68 failing entries are additional environment-gated pre-existing gaps**, none touching `episode_version_public_*`:
- 36 tests require `TEAM4S_PHASE128_TEST_DSN`/`TEAM4S_PHASE134_MIGRATION_DSN` (not set this run — this baseline only configured the Phase-117 DSN that Phase 163's own tests use).
- 9 `TestPhase134Matrix*` tests fail with `connect: connection refused` against `192.168.235.196:18093` (live backend not reachable on that port from inside the container this session).
- 3 `TestPhase134Matrix*` tests fail with a Keycloak `invalid_grant` (test credentials not valid/seeded this session).
- 2 Jellyfin fixture tests fail on a missing fixture file (`docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json`).
- A handful of `TestEpisodeImportSource*`/`TestEpisodeVersionDate*`/`TestEpisodeVersionDelete*`/`TestMemberClaims*`/`TestClaimBlock*`/`TestEvaluateMemberMutation*` tests fail on pre-existing schema-shim gaps or string-based Altlast checks, unrelated to episodes/fansub-group filtering.

Full breakdown and rationale for each: `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/deferred-items.md`.

**Critically, zero `TestEpisodeVersionPublic*` tests appear in this pre-fix failure list** — confirming the baseline (before Plan 163-01's own test corrections) matches Pitfall 2's description: the existing assertions currently *pass* because they encode the bug.

### Live EXPLAIN (ANALYZE, BUFFERS) baseline — team4s_v2, anime_id=4 (Naruto), unfiltered

Command: `docker exec team4sv30-db psql -U team4s -d team4s_v2 -f /tmp/163-explain-before.sql` running the exact current `publicEpisodeQuery` text with `$1=4, $2=0, $3=0, $4=0, $5=25` substituted literally (5-argument pre-fix query shape; no `$6` group parameter exists yet).

Literal plan output (abbreviated to the load-bearing nodes; full 62-line plan captured in this task's execution trail):
```
Incremental Sort  (cost=222.98..441.64 rows=25 width=294) (actual time=2.885..2.889 rows=25 loops=1)
  ->  Nested Loop Left Join  (actual time=2.729..2.846 rows=25 loops=1)
        ->  Limit  (actual time=2.484..2.489 rows=25 loops=1)
              ->  Sort  (actual time=2.482..2.485 rows=25 loops=1)
                    ->  Subquery Scan on inventory  (actual time=2.281..2.435 rows=220 loops=1)
                          ->  WindowAgg  (actual time=2.278..2.409 rows=220 loops=1)
                                ->  Sort  (actual time=2.269..2.279 rows=220 loops=1)
                                      ->  Nested Loop Left Join  (actual time=0.376..2.185 rows=220 loops=1)
                                            ->  Seq Scan on episodes e  (actual time=0.359..0.887 rows=220 loops=1)
Planning Time: 9.511 ms
Execution Time: 3.005 ms
```
`Subquery Scan on inventory ... rows=220` confirms the exact neutral-row bug live in current production data: all 220 Naruto episodes are scanned/emitted by the `LEFT JOIN LATERAL` before the outer `LIMIT` trims to 25, even though only episodes 1-5 have any real release. This matches 163-RESEARCH.md's documented root cause. **Drift note:** RESEARCH.md documented ~1.226ms Execution Time for this exact query on 2026-09-17; this fresh run measured 3.005ms Execution Time (buffers: 797 hit / 38 read at planning time vs. a cooler cache in this specific run) — same query shape and same 220-row inventory scan, execution time is within normal variance for a live, shared dev Postgres instance, not a data-volume change (still 220 episodes, releases only on 1-5).

**No writes were issued against `team4s_v2` in this task.** Every statement run against `team4s_v2` in Task 1 was `SELECT` (group-slug lookup) or `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` (read-only by definition — `EXPLAIN ANALYZE` executes the query but issues no `INSERT`/`UPDATE`/`DELETE`/`ALTER`). The only `CREATE DATABASE` statement issued this session created `team4s_phase117_test_163`, a completely separate database on the same Postgres server — `team4s_v2` was never targeted by that statement.

## Task 2 + 3 Verification (literal RED confirmation)

```
$ go test ./internal/repository/... -run TestEpisodeVersionPublicMixedAndIdentity -v
--- FAIL: TestEpisodeVersionPublicMixedAndIdentity (0.11s)
    "...4 episodes..." should have 2 item(s), but has 4
    Messages: episodes without any public release (12, 13) must disappear entirely after the fix

$ go test ./internal/repository/... -run TestEpisodeVersionPublicAtomicPages -v
--- FAIL: TestEpisodeVersionPublicAtomicPages (0.19s)
    --- FAIL: .../1, .../24, .../100 — "Should NOT be empty, but was []"
    Messages: public projection must never return a neutral (versionless) episode row

$ go test ./internal/repository/... -run TestEpisodeVersionPublicEmptyAndVisibility -v
--- FAIL: TestEpisodeVersionPublicEmptyAndVisibility (0.11s)
    "Should be empty, but was [{51 1 Only neutral 0 <nil> []}]"
    Messages: anime 5's only episode has zero releases and must not appear after the fix

$ go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilter -v
--- FAIL: TestEpisodeVersionPublicGroupFilterBasics            (wrong episode set: AO-filter returned all 5, expected 3)
--- FAIL: TestEpisodeVersionPublicGroupFilterNarutoRegression  (AO-filter includes PM-only episode 703)
--- FAIL: TestEpisodeVersionPublicGroupFilterPaginationScope   (limit=1 PM-filter returned episode 8001, expected 8030)
--- FAIL: TestEpisodeVersionPublicGroupFilterNonPublicVersion  (group-less episode 706 visible under Alle)
--- FAIL: TestEpisodeVersionPublicGroupFilterCursorScope       (expected 400, got 200 — cursor scope not yet enforced)
--- FAIL: TestEpisodeVersionPublicGroupFilterUnknownSlug       (expected 400, got 200 — slug not yet validated)
FAIL  team4s.v3/backend/internal/repository
```

```
$ go build ./... && go vet ./...
(both clean — files compile despite failing assertions)
```

## Decisions Made

See `key-decisions` in frontmatter above (Pflichtfall F fixture placement; RESEARCH.md 400-vs-silently-ignored correction; container/test-DB strategy).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Container `/app` is a static build-time copy, not live-synced with host edits**
- **Found during:** Task 2 (attempting to `go build`/`go vet` against the just-edited host file)
- **Issue:** `docker inspect team4sv30-backend` shows no bind mount for the backend Go source tree (only `database/migrations`, `media`, `shared/contracts`, and `frontend/src/types` are mounted); an initial `diff` against the container's copy was coincidentally identical only because the file hadn't changed since the image was built. Running `go build`/`go vet`/`go test` directly against `/app` inside the container after editing the host file would silently test stale code.
- **Fix:** `docker cp` each edited/new test file into `team4sv30-backend:/app/internal/repository/...` before every `go build`/`go vet`/`go test` invocation in this plan; verified byte-identical via `diff` after each copy.
- **Files modified:** none (tooling-only; no production or test file content affected by this fix itself).
- **Verification:** `diff <(docker exec team4sv30-backend cat ...) <host file>` reported `IDENTICAL` before each test run.
- **Committed in:** not applicable (no code change; documented here for the next plan's executor).

**2. [Rule 1 - Bug in this plan's own draft assumption] RESEARCH.md's "unknown-key rejection" claim for `fansub` is inaccurate**
- **Found during:** Task 3 (running the new `TestEpisodeVersionPublicGroupFilterCursorScope`/`...UnknownSlug` tests, which assumed a 400 from `parseStrictNamedQuery`)
- **Issue:** `parseStrictNamedQuery` (`episode_version_grants.go` lines 129-150) silently drops any query key not in its `names` allowlist rather than erroring — so `?fansub=...` today is silently ignored, not rejected. All fansub-bearing requests currently behave exactly like "Alle".
- **Fix:** No test-file change was needed — every new test still fails today for a legitimate, documented reason (wrong episode set, or 200 instead of the required 400), just via a slightly different code path than RESEARCH.md described. Documented as a correction in `key-decisions` above so Plan 163-02's executor does not re-derive the same incorrect assumption.
- **Files modified:** none.
- **Verification:** live test run output (see "Task 2 + 3 Verification" above) shows the actual failure reasons.
- **Committed in:** `a08a5f43` (test file itself needed no change; this is a documentation-only correction).

## Known Stubs

None — this plan is test-file-only; no production code, UI, or data flow was stubbed.

## Threat Flags

None — this plan added no new production surface. The new fixture's Pflichtfall I row (a `release_versions` row with a variant but zero `release_version_groups` rows) is fixture-only test data proving the fail-closed regression case, not a live disclosure (matches the plan's own `threat_model` T-163-02 disposition: accept).

## Self-Check: PASSED

- FOUND: `backend/internal/repository/episode_version_public_integration_test.go`
- FOUND: `backend/internal/repository/episode_version_public_group_filter_test.go`
- FOUND: `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/deferred-items.md`
- FOUND commit `4e8be6d8` (Task 2)
- FOUND commit `a08a5f43` (Task 3)
