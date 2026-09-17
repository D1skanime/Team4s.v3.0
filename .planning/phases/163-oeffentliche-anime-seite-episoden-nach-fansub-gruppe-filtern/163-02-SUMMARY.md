---
phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
plan: 02
subsystem: api
tags: [go, postgres, pgx, sql, episodes, fansub-groups, pagination, cursor]

# Dependency graph
requires:
  - phase: 163-01
    provides: "RED test baseline (episode_version_public_integration_test.go corrected assertions + episode_version_public_group_filter_test.go new fixture) that this plan turns GREEN"
provides:
  - "publicEpisodeQuery v2: INNER JOIN LATERAL + unconditional release_version_groups EXISTS gate (D-01/D-02 fail-closed visibility), total CTE for episode_count (D-12), cursor v2 with a raw-slug identity field (D-06)"
  - "FansubRepository.ResolveFansubGroupIDForAnime: anime_fansub_groups-scoped slug->group-id resolver, fail-closed ErrNotFound (D-05/T-163-03)"
  - "ListGroupedEpisodes public branch: additive fansub allowlist entry, validate-before-resolve ordering so a cross-filter cursor is rejected before any SQL runs"
  - "OpenAPI: fansub query parameter + episode_count response field, kept in sync with the Go DTO"
affects: [163-03, 163-04, 163-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cursor-scope identity via raw, unresolved request value (fansub slug string) instead of a resolved DB id, so a filter-scope mismatch can be rejected with zero DB round trips before any resolution/existence/main query runs"
    - "Unconditional EXISTS predicate inside a LATERAL subquery serving two roles at once: baseline fail-closed visibility gate (D-02) and, when non-NULL, the active group filter itself (D-03), with coop handled for free"
    - "Same-statement hit count via a separate COUNT(DISTINCT ...) CTE cross-joined into the final SELECT (COUNT DISTINCT is not valid inside a window OVER(...))"

key-files:
  created: []
  modified:
    - backend/internal/repository/episode_version_public_query.go
    - backend/internal/models/episode_version.go
    - backend/internal/repository/fansub_repository.go
    - backend/internal/handlers/episode_version_reads.go
    - shared/contracts/openapi.yaml
    - backend/internal/repository/episode_version_public_group_filter_test.go

key-decisions:
  - "publicEpisodeCursor's scope field stores the raw, unresolved fansub slug string (json:\"g\"), not the resolved numeric group id, specifically so the handler can validate cursor scope (and reject a cross-filter cursor) BEFORE resolving the slug to an id. This is a deliberate deviation from 163-02-PLAN.md's literal `GroupID int64` interface suggestion, required to satisfy the already-locked TestEpisodeVersionPublicGroupFilterCursorScope test's `require.Empty(t, tr.queries, ...)` assertion (zero DB round trips on a filter-scope mismatch, mirroring the existing 'foreign anime cursor fails before SQL' contract)."
  - "Handler validates (options.Validate(animeID), pure Go, no DB) BEFORE resolving the fansub slug via ResolveFansubGroupIDForAnime (1 DB query), reversing 163-02-PLAN.md's suggested code-example ordering. Slug resolution only runs once cursor-scope validation has already passed, so a mismatched filter+cursor combination never touches the database."
  - "Added the anime_fansub_groups table and anime7/8<->group3/4 rows to episode_version_public_group_filter_test.go's fixture (Rule 3 - blocking issue): the resolver's production query needs this table, which existed in neither the base Phase-117 test schema nor the group-filter fixture as committed by Plan 163-01 (that fixture predates the resolver; the fansub parameter was previously silently ignored by parseStrictNamedQuery, per 163-01's own documented correction). This is additive fixture setup only - no assertions were added, changed, or removed."

requirements-completed: [REQ-163-01, REQ-163-02, REQ-163-03, REQ-163-04, REQ-163-05, REQ-163-06, REQ-163-07, REQ-163-08, REQ-163-09, REQ-163-10, REQ-163-11, REQ-163-12, REQ-163-24]

duration: 55min
completed: 2026-09-17
---

# Phase 163 Plan 02: Server-Side Group Filter + D-01/D-02 Visibility Fix Summary

**Turned `publicEpisodeQuery`'s `LEFT JOIN LATERAL` into an `INNER JOIN LATERAL` with an unconditional `release_version_groups EXISTS` gate (fixing the neutral-row bug that made every episode visible regardless of releases) and added a fail-closed, anime-scoped `fansub=<slug>` server-side filter, cursor v2, and a same-statement `episode_count`, turning all 9 of Plan 163-01's RED tests GREEN with zero regressions against the documented pre-fix baseline.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-09-17
- **Tasks:** 3/3 completed
- **Files modified:** 5 production files (per plan) + 1 test fixture file (deviation, documented below)

## Accomplishments

- Fixed the D-01/D-02 neutral-row visibility bug live: `EXPLAIN (ANALYZE, BUFFERS)` against `team4s_v2` (Naruto, anime_id=4) now shows the unfiltered "Alle" case returning exactly 5 episodes (was 220 before the fix) and the AnimeOwnage-filtered case (`fansub_group_id=29`) returning exactly episodes 1, 2, 5 (verified via a direct read-only `SELECT DISTINCT episode_id` against the fixed query shape) — matching 163-RESEARCH.md's documented live verification.
- Implemented the server-side group filter end-to-end: `PublicEpisodeOptions.Fansub`/`GroupID`, the `EXISTS (... release_version_groups ...)` predicate parameterized by a nullable `$6`, `FansubRepository.ResolveFansubGroupIDForAnime` (anime-scoped, IDOR-safe), and the handler's additive `fansub` allowlist entry.
- Added a same-statement `episode_count` (D-12) via a `total` CTE (`COUNT(DISTINCT episode_id)`) cross-joined into the final `SELECT`, exposed as `PublicGroupedEpisodesData.EpisodeCount` and the OpenAPI `episode_count` field.
- Bumped the public episode cursor to v2 with a filter-scope identity field, and — after discovering the naive resolved-id design would cost an unnecessary DB round trip on a cross-filter cursor — redesigned it to carry the raw slug string so a scope mismatch is rejected before any SQL touches the database (see Decisions).
- All 9 targeted tests (`TestEpisodeVersionPublicMixedAndIdentity`, `...AtomicPages`, `...EmptyAndVisibility`, `...GroupFilterBasics`, `...GroupFilterNarutoRegression`, `...GroupFilterPaginationScope`, `...GroupFilterNonPublicVersion`, `...GroupFilterCursorScope`, `...GroupFilterUnknownSlug`) are GREEN; full `go test ./...` shows the identical 69 top-level pre-existing failures documented in `163-01-SUMMARY.md` (same packages, same test names, same environment-gated reasons) — zero new failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix publicEpisodeQuery — INNER JOIN LATERAL + group EXISTS + cursor v2 + total CTE** - `0cba3920` (feat)
2. **Task 2: Anime-scoped slug resolver + handler wiring + OpenAPI contract sync** - `c3109294` (feat)
3. **Task 3: Full regression, after-fix EXPLAIN comparison, and Naruto before/after report** - verification only, no code changes; no commit (per plan's `files: none` for this task)

**Plan metadata:** recorded separately after this SUMMARY (see final commit).

## Files Created/Modified

- `backend/internal/repository/episode_version_public_query.go` — `INNER JOIN LATERAL` + unconditional `EXISTS(release_version_groups ...)`, `total` CTE, cursor v2 (`Fansub string` scope field), `PublicEpisodeOptions.{Fansub,GroupID}`.
- `backend/internal/models/episode_version.go` — `PublicGroupedEpisodesData.EpisodeCount int64` (sibling to `Pagination`).
- `backend/internal/repository/fansub_repository.go` — `ResolveFansubGroupIDForAnime(ctx, animeID, slug)`, anime-scoped, fail-closed `ErrNotFound`.
- `backend/internal/handlers/episode_version_reads.go` — `fansub` allowlist entry; validate-before-resolve ordering; 400 mapping for an unresolvable slug.
- `shared/contracts/openapi.yaml` — `fansub` query parameter, `episode_count` response field, extended 400-response description.
- `backend/internal/repository/episode_version_public_group_filter_test.go` — additive fixture-only change: `anime_fansub_groups` table + anime7/8↔group3/4 rows (see Deviations).

## Decisions Made

See `key-decisions` in frontmatter above (cursor-scope-via-raw-slug redesign; validate-before-resolve handler ordering; additive fixture fix for the resolver's missing dependency table).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in this plan's own draft design] Cursor-scope check as originally specified would cost an extra DB query on a filter mismatch, failing the already-locked query-budget assertion**
- **Found during:** Task 2, running `TestEpisodeVersionPublicGroupFilterCursorScope`
- **Issue:** 163-02-PLAN.md's interfaces/behavior text and 163-RESEARCH.md's Pattern 2 specify a `publicEpisodeCursor.GroupID int64` field compared against the *resolved* numeric group id. Implementing it exactly as specified requires resolving the current request's `fansub` slug (1 DB query) *before* the cursor-scope comparison can run — but the test asserts `require.Empty(t, tr.queries, "a cursor scoped to one group filter must fail before SQL once the filter changes")`, i.e. literally zero queries when the filter changes.
- **Fix:** Changed the cursor's scope field to carry the raw, unresolved slug string (`Fansub string`, `json:"g"`) instead of the resolved numeric id, and reordered the handler to call `options.Validate(animeID)` (pure Go, no DB) *before* `ResolveFansubGroupIDForAnime` (1 DB query). A cursor minted under one slug now fails validation against a different slug with zero DB round trips, exactly mirroring the pre-existing "foreign anime cursor fails before SQL" contract already tested in `episode_version_public_integration_test.go`.
- **Files modified:** `backend/internal/repository/episode_version_public_query.go`, `backend/internal/handlers/episode_version_reads.go`.
- **Verification:** `TestEpisodeVersionPublicGroupFilterCursorScope` GREEN; `go test ./internal/repository/... -run TestEpisodeVersionPublic` full GREEN; `go build ./... && go vet ./...` clean.
- **Committed in:** `c3109294` (Task 2 commit).

**2. [Rule 3 - Blocking issue] `anime_fansub_groups` table missing from the group-filter test fixture**
- **Found during:** Task 2, first run of `TestEpisodeVersionPublicGroupFilter*` after wiring the resolver
- **Issue:** `ResolveFansubGroupIDForAnime`'s production SQL joins `anime_fansub_groups`, but neither the base Phase-117 test schema (`testsupport.OpenPhase117Postgres`) nor `episode_version_public_group_filter_test.go`'s own fixture (committed by Plan 163-01, before the resolver existed) creates this table — every `fansub=`-bearing request in the new test file failed with `500`/`relation "anime_fansub_groups" does not exist`.
- **Fix:** Added `CREATE TABLE anime_fansub_groups (...)` (minimal columns matching the real migration's shape) plus `INSERT INTO anime_fansub_groups (anime_id,fansub_group_id) VALUES (7,3),(7,4),(8,3),(8,4)` to the existing fixture setup block. No test function, assertion, or expected value was added, changed, or removed — purely additive schema/data the already-authored assertions needed to even reach a 200/400 response instead of a 500.
- **Files modified:** `backend/internal/repository/episode_version_public_group_filter_test.go`.
- **Verification:** all 6 `TestEpisodeVersionPublicGroupFilter*` tests GREEN after the fix; diffed the change against the file's git history to confirm only the fixture SQL block changed, no assertions touched.
- **Committed in:** `c3109294` (Task 2 commit, bundled with the resolver it unblocks).

---

**Total deviations:** 2 auto-fixed (1 bug in this plan's own design, 1 blocking fixture gap).
**Impact on plan:** Both were necessary to make the already-locked Plan 163-01 tests pass without weakening any assertion. No new test scope was introduced — deviation 2 is fixture setup (schema + rows), not a new test case, and deviation 1 changes only the *internal representation* of the cursor's scope field, not any externally observable behavior beyond what D-06 already required (a cursor is rejected across a filter change).

## Issues Encountered

None beyond the two deviations above, which were fully resolved within this plan.

## User Setup Required

None - no external service configuration required.

## Verification Evidence (Task 3)

### Full regression vs. 163-01's pre-fix baseline

`go test ./...` (same `TEAM4S_PHASE117_TEST_DSN` configuration as 163-01's baseline capture) produced **69 top-level failing test entries** — the identical count, package set (`handlers`, `migrations`, `repository`), and test names documented in `163-01-SUMMARY.md`'s pre-fix baseline (Phase-128/134 DSN-gated tests, live-service-gated `TestPhase134Matrix*`, missing Jellyfin fixture files, pre-existing schema-shim gaps, `TestFansubRepository_PublicProfileSourceInvariants`, Altlast string-based claim-block checks). **Zero `TestEpisodeVersionPublic*` failures, zero new failures of any kind.**

### After-fix live EXPLAIN (ANALYZE, BUFFERS) — team4s_v2, anime_id=4 (Naruto), read-only

**Unfiltered ("Alle", `$6`=NULL):**
```
CTE inventory -> WindowAgg ... (actual time=1.292..1.298 rows=5 loops=1)
...
Incremental Sort  (actual time=1.366..1.369 rows=5 loops=1)
Planning Time: 1.833 ms
Execution Time: 1.482 ms
```
Before-fix baseline (163-01): `Subquery Scan on inventory ... rows=220`, Execution Time 3.005ms. **After-fix: 5 rows instead of 220** — confirms the neutral-row bug is gone; only episodes with an actual public release now enter the inventory.

**AnimeOwnage-filtered (`$6`=29):**
```
CTE inventory -> WindowAgg ... (actual time=1.729..1.736 rows=3 loops=1)
Execution Time: 2.001 ms
```
A direct read-only `SELECT DISTINCT episode_id FROM inventory` (same fixed query shape, `$6=29`) confirms the 3 returned episode ids are exactly **53, 54, 57** (episode_number 1, 2, 5) — matching 163-RESEARCH.md's documented live verification of AnimeOwnage's actual releases on Naruto.

Total episodes for anime_id=4: 220 (confirmed via `SELECT COUNT(*) FROM episodes WHERE anime_id=4 ...`), so both cases now scan/return only the matching subset, not all 220.

### Live container rebuild: NOT performed in this task (as planned)

Per 163-02-PLAN.md Task 3's explicit instruction, the running `team4sv30-backend` container was **not** rebuilt in this task — it predates this code change (no bind mount for `backend/` source per 163-01's documented finding; `docker inspect` confirms). Rebuild is deferred to Plan 163-05, which performs the full container rebuild before live browser UAT (bundling this plan's backend fix together with 163-03/163-04's frontend changes so the live stack only needs one rebuild). Verification in this task instead relied on: (a) the full `go test ./...` regression above (which exercises the fixed code via the isolated `team4s_phase117_test_163` database, never `team4s_v2`), and (b) live, read-only `EXPLAIN`/`SELECT` runs against the actual production data in `team4s_v2` using the fixed query's exact SQL text with literal parameter substitution — both of which confirm the fix is correct against real data without touching the live container's running binary.

## Next Phase Readiness

- Backend fix (D-01/D-02 visibility, D-03 filtered version_count/default_version_id, D-04 `fansub` param naming, D-05 fail-closed slug resolution, D-06 cursor scope, D-12 `episode_count`) is complete, tested, and verified live against real data.
- `shared/contracts/openapi.yaml` and the Go DTO are in sync (`fansub` param, `episode_count` field) — ready for Plan 163-03/163-04 to consume from the frontend (`frontend/src/types/episodeVersion.ts`, `frontend/src/lib/api.ts`).
- Live container rebuild is intentionally deferred to Plan 163-05 (documented above) — Plans 163-03/163-04 should account for this when deciding their own rebuild/verification strategy.
- `backend/internal/repository/fansub_repository.go`'s pre-existing 450-line-cap overage (2471→2496 lines) is logged in `deferred-items.md` as out-of-scope cleanup, not fixed in this plan (Scope Boundary rule).

---
*Phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/episode_version_public_query.go`
- FOUND: `backend/internal/repository/fansub_repository.go`
- FOUND: `backend/internal/handlers/episode_version_reads.go`
- FOUND: `backend/internal/models/episode_version.go`
- FOUND: `shared/contracts/openapi.yaml`
- FOUND: `backend/internal/repository/episode_version_public_group_filter_test.go`
- FOUND commit `0cba3920` (Task 1)
- FOUND commit `c3109294` (Task 2)
