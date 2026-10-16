---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 06
subsystem: testing
tags: [postgres, pgx, fixtures, search, handlers, repository]

requires:
  - phase: 185-05
    provides: Phase-134 matrix env-override fix (unrelated cluster, no shared files)
provides:
  - "fansub_public_group_display_url_test.go seeds visibilities/review_statuses before its media_assets inserts (D-05 FK fix)"
  - "group_release_version_count_test.go's groupID constants no longer collide with group_contributors_repository_test.go's on the shared Phase-155 fixture (D-02 fix)"
  - "search_bypass_integration_test.go's hand-rolled Phase-106 fixture carries the cover-resolution columns/tables searchAnime's unconditional LATERAL join needs (D-02 fix)"
  - "searchQueryBypassAllowed reverted to its mandated narrow tag/genre-only q-bypass (Auftraggeber-Mandat Punkt 3), fixing an undocumented regression from commit c02aa7d66"
affects: [185-handlers-search, 185-repository-fansub, 185-repository-group]

tech-stack:
  added: []
  patterns:
    - "Shared, non-schema-isolated Phase-152/155 fixture databases need per-test disjoint id ranges AND defensive self-cleanup DELETEs across every file that seeds into them, since no automatic isolation exists -- the group_release_version_count_test.go cluster still lacks the latter, making repeated -count=1 runs without a fresh database non-idempotent (pre-existing, accepted per T-185-06-01, not introduced by this plan)"

key-files:
  created: []
  modified:
    - backend/internal/repository/fansub_public_group_display_url_test.go
    - backend/internal/repository/group_release_version_count_test.go
    - backend/internal/handlers/search_bypass_integration_test.go
    - backend/internal/handlers/search.go
    - backend/internal/handlers/search_test.go

key-decisions:
  - "Task 3's fixture fix exposed a second, independent bug: once the schema gap was closed, TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd ran the real query successfully (no more 500) and failed on its own assertion (got 200, want 400). Root-caused to commit c02aa7d66 ('feat: improve global search filters and results', a non-GSD-workflow direct edit) which widened searchQueryBypassAllowed to also treat format/status/year_from/year_to/fansub_group(_query) as q-bypass triggers -- directly contradicting the already-shipped, explicit Auftraggeber-Mandat Punkt 3 regression guard from Plan 160-04/160-05 ('Regressionsschutz gegen Aufblähen': a q-less request with only format/status/year/fansub_group set must stay 400) and the frontend's still-narrow bypassMinLength gate (useDebouncedSearch.ts, tag/genre only, never updated to match the backend widening). Reverted the gate to the mandated narrow form; corrected search_test.go's TestSearchQueryBypassAllowed cases that had encoded the regression as 'want: true' for format/fansubGroupQuery/yearFrom."
  - "media_assets' stand-in table needed an explicit media_type_id column beyond what the plan's literal action text specified (id, file_path only) -- searchAnime's LATERAL join does 'JOIN media_types mt ON mt.id = ma.media_type_id', which fails at parse/plan time if the column does not exist, even with zero rows in the table. Added media_type_id BIGINT to media_assets (Rule 1/3 -- the plan's literal spec was incomplete, verified empirically before committing)."
  - "Both Phase-152 and Phase-155 throwaway databases (team4s_phase152_test, team4s_phase155_test) did not exist in this environment and were provisioned via pg_dump --schema-only of team4s_v2 + psql restore, matching the fixture files' own doc comments ('must carry the FULL real schema, pg_dump --schema-only of team4s_v2'). Never touched team4s_v2 itself."

patterns-established:
  - "When a plan's stated root-cause diagnosis for a cluster of same-symptom test failures turns out to be only partially correct (3/4 tests share one root cause, the 4th surfaces a second cause once the first is fixed), verify empirically with throwaway databases before accepting the plan's literal task scope, and document the additional fix as a Rule 1 deviation with the full evidentiary chain (git log -S, cross-referencing shipped Auftraggeber-Mandat documentation, frontend behavior) rather than assuming the plan's diagnosis was complete."

requirements-completed: [D-02, D-05]

duration: ~55min
completed: 2026-10-16T20:45:00Z
---

# Phase 185 Plan 06: Drei unabhängige Fixture-Lücken (D-05 Seed, D-02 ID-Kollision, D-02 Search-Bypass-Schema) Summary

**Three independent, file-local fixture gaps closed (FK seed rows, colliding group-ID literals, missing cover-resolution schema stand-ins), plus one newly-discovered production bug reverted: `searchQueryBypassAllowed` had silently regressed past its mandated narrow tag/genre-only q-bypass.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-10-16T20:45:00Z
- **Tasks:** 3/3 completed (plus one Rule-1 auto-fix to production code, discovered mid-Task-3)
- **Files modified:** 5

## Accomplishments

- `TestGetPublicGroupBase_PrefersDisplayVariant` and `TestGetPublicGroupBase_SVGLogoKeepsStoredURL` now seed `visibilities (id=1)`/`review_statuses (id=2)` before their `media_assets` inserts, matching the sibling `fansub_public_media_display_url_test.go` pattern exactly — no more FK violation on the shared, non-isolated Phase-152 fixture.
- `group_release_version_count_test.go`'s two `groupID` constants moved from the confirmed-colliding `1550400`/`1550500` (shared with `group_contributors_repository_test.go`) to the confirmed-unused `1550600`/`1550700` — no more duplicate-key error on the shared Phase-155 fixture, and the sibling file's own tests remain green.
- `search_bypass_integration_test.go`'s hand-rolled Phase-106 fixture gained `anime.cover_resolved_url`/`anime.source` columns plus empty stand-in tables `media_types`/`media_assets` (including `media_type_id`, needed beyond the plan's literal spec)/`anime_media`, letting `searchAnime`'s unconditional cover-image `LEFT JOIN LATERAL` resolve without erroring.
- Discovered and fixed a second, independent bug exposed by the above schema fix: `searchQueryBypassAllowed` in `search.go` had been widened (commit `c02aa7d66`) to treat `format`/`status`/`year_from`/`year_to`/`fansub_group(_query)` as q-bypass triggers, contradicting the shipped Auftraggeber-Mandat Punkt 3 regression guard. Reverted to the mandated narrow `q == "" && (genre != nil || tag != nil)` form and corrected the three now-stale `search_test.go` unit-test cases that had encoded the regression as expected behavior.
- Provisioned two previously-nonexistent throwaway databases (`team4s_phase152_test`, `team4s_phase155_test`) via `pg_dump --schema-only` of `team4s_v2` + restore, matching each fixture file's own documented requirement — never touched `team4s_v2`.
- All 8 target tests (2+2+4) pass; `go build ./...` and `go vet ./...` clean across the whole backend module; no sibling test in either shared-database family regressed (`TestGroupContributorsRepository*`, `TestFansubProjectResolverQueryBudgetIsConstant`, `TestListPublicFansubMediaDisplayURLFallback`, `TestSearchBypassTagOnlyTypeFansubStaysEmpty`, the two bypass-rejection 400 tests, and the full `TestSearchQueryBypassAllowed`/`TestSearchRejects*` unit suite all still pass).

## Task Commits

Each task was committed atomically:

1. **Task 1: D-05 — seed visibilities/review_statuses before both media_assets inserts** - `ff82eef84` (fix)
2. **Task 2: D-02 — renumber group_release_version_count_test.go's groupIDs to a disjoint range** - `36215894c` (fix)
3. **Task 3: D-02 — add missing anime cover-resolution columns/tables to the search-bypass fixture (+ Rule-1 production bug revert)** - `457a40f03` (fix)

**Plan metadata:** (this commit, created after this SUMMARY)

## Files Created/Modified

- `backend/internal/repository/fansub_public_group_display_url_test.go` - both tests' `mustExecPhase152` calls gained `INSERT INTO visibilities ... ON CONFLICT (id) DO NOTHING` / `INSERT INTO review_statuses ... ON CONFLICT (id) DO NOTHING` immediately before their `media_assets` inserts.
- `backend/internal/repository/group_release_version_count_test.go` - `groupID` constants `1550400`→`1550600` and `1550500`→`1550700`; no other logic touched.
- `backend/internal/handlers/search_bypass_integration_test.go` - `openSearchBypassFixture`'s SQL block gained `ALTER TABLE anime ADD COLUMN cover_resolved_url TEXT, ADD COLUMN source TEXT` and three new empty stand-in tables (`media_types`, `media_assets` with `media_type_id`, `anime_media`); no rows seeded into any of the three.
- `backend/internal/handlers/search.go` - `searchQueryBypassAllowed` reverted to `q == "" && (genre != nil || tag != nil)`; doc comment updated to explain the mandate and the reverted regression (params kept unused-but-present to avoid touching every call site's signature).
- `backend/internal/handlers/search_test.go` - `TestSearchQueryBypassAllowed`'s `format`/`fansubGroupQuery`/`yearFrom` cases changed from `want: true` to `want: false`, matching the corrected narrow bypass.

## Decisions Made

- **media_assets needed `media_type_id`, not just `id`/`file_path` (plan's literal spec was incomplete).** `searchAnime`'s `LEFT JOIN LATERAL` does `JOIN media_types mt ON mt.id = ma.media_type_id`; Postgres resolves that column reference at query-plan time regardless of row count, so omitting the column (as the plan's `<action>` text literally specified) would still error. Verified empirically by running the test with only `id`/`file_path` first, observing the column-does-not-exist error, then adding `media_type_id`.
- **Reverted `searchQueryBypassAllowed`'s format/status/year/fansub_group widening (Rule 1 — auto-fix bug, outside the plan's declared file scope).** The plan explicitly stated "no production code" for this fixture-only cluster, under the assumption all 4 red tests shared one root cause (the schema gap). Fixing the schema gap proved 3/4 tests passed immediately, but `TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd` then failed on its real assertion (200 instead of 400) — a second, independent bug the schema error had been masking. Root-caused via `git log -S searchQueryBypassAllowed`: commit `c02aa7d66` ("feat: improve global search filters and results", Sep 28, a generic non-GSD-workflow message) widened the function from its original Plan-160-04 form (`q == "" && (genre != nil || tag != nil)`) to also bypass on `format`/`status`/`year_from`/`year_to`/`fansub_group(_query)`. This directly contradicts the already-shipped Auftraggeber-Mandat Punkt 3 ("Regressionsschutz gegen Aufblähen", documented in `160-05-SUMMARY.md`'s point 3: a format-only, q-less request must stay blocked/400) and the frontend's `useDebouncedSearch.ts` `bypassMinLength`, which was never updated to match the backend widening and still only checks `tag`/`genre`. Given the explicit, dated, shipped mandate plus the frontend's independent confirmation, the widening was treated as the bug, not the integration test. Reverted the gate and corrected the one unit-test file (`search_test.go`) that had encoded the regression as expected behavior.
- **Both Phase-152/155 throwaway databases provisioned via schema-only dump+restore of team4s_v2, not migration replay.** Matches each fixture file's own doc comment ("must carry the FULL real schema, pg_dump --schema-only of team4s_v2"), unlike the Phase-134 matrix pattern (full migration replay + seed) used elsewhere in this phase, which these two fixture families don't need (they seed their own rows directly per test).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] media_assets stand-in table needed media_type_id beyond the plan's literal column list**
- **Found during:** Task 3 verification
- **Issue:** The plan's `<action>` specified `CREATE TABLE media_assets (id BIGINT PRIMARY KEY, file_path TEXT)`. `searchAnime`'s LATERAL join references `ma.media_type_id`, which Postgres resolves at query-plan time even with an empty table — the test would fail with "column does not exist" without it.
- **Fix:** Added `media_type_id BIGINT` to the `media_assets` stand-in table (no FK, no rows, matching the plan's "no FK constraints" instruction).
- **Files modified:** `backend/internal/handlers/search_bypass_integration_test.go`
- **Verification:** All 4 target tests pass against a fresh `team4s_phase106_test_173` schema.
- **Committed in:** `457a40f03` (Task 3 commit)

**2. [Rule 1 - Bug] Reverted an undocumented regression in `searchQueryBypassAllowed` that contradicted a shipped Auftraggeber-Mandat**
- **Found during:** Task 3 verification (fixing the schema gap exposed this as the test's real remaining failure)
- **Issue:** Commit `c02aa7d66` had widened `searchQueryBypassAllowed` to bypass the q-requirement for `format`/`status`/`year_from`/`year_to`/`fansub_group(_query)` filters alone, contradicting Plan 160-04/160-05's explicit Auftraggeber-Mandat Punkt 3 regression guard (documented in `160-05-SUMMARY.md`) and the frontend's still-narrow `bypassMinLength` gate.
- **Fix:** Reverted `searchQueryBypassAllowed` to `q == "" && (genre != nil || tag != nil)`; corrected `search_test.go`'s `TestSearchQueryBypassAllowed` cases that had encoded the regression as `want: true`.
- **Files modified:** `backend/internal/handlers/search.go`, `backend/internal/handlers/search_test.go`
- **Verification:** `TestSearchQueryBypassAllowed` (all 7 subtests), all `TestSearchRejects*` unit tests, and all 4 target `search_bypass_integration_test.go` tests pass; full `internal/handlers` package build/vet clean.
- **Committed in:** `457a40f03` (same commit as Task 3, same root cause)

## Verification Evidence

Combined plan verification command run against throwaway databases (never `team4s_v2`):
```
go build ./... &&
go test ./internal/repository/... -run 'TestGetPublicGroupBase|TestGetGroupReleaseVersionCount' -v -count=1 &&
go test ./internal/handlers/... -run TestSearchBypass -v -count=1
```
All 6 named tests pass. Additionally verified (not in the plan's named verify command, but checked for regressions): `TestGroupContributorsRepository*` (2), `TestFansubProjectResolverQueryBudgetIsConstant`, `TestListPublicFansubMediaDisplayURLFallback`, `TestSearchBypassTagOnlyTypeFansubStaysEmpty`, `TestSearchBypassRejectsMissingQueryNoFilters`, `TestSearchBypassRejectsPresentButShortQueryWithTag`, `TestSearchNeverReturnsNullItemsForUnsearchedEntity`, and the full `TestSearchQueryBypassAllowed`/`TestSearchRejects*` unit suite — all pass. `gofmt -l` clean on all 5 modified files. The broader `internal/handlers`/`internal/repository` package test runs surfaced only pre-existing, already-documented, unrelated failures (missing `docs/audits/2026-09-15-jellyfin12/fixtures/*.json` in this container's mount — tracked in `STATE.md`; missing `TEAM4S_PHASE128_TEST_DSN`/Phase-134-matrix-container/Keycloak-credential issues — unrelated fixture families with no shared files).

Note: `group_release_version_count_test.go` and `fansub_project_resolver_query_budget_test.go` lack defensive self-cleanup `DELETE`s (unlike `fansub_public_group_display_url_test.go`'s sibling pattern), so repeated `-count=1` runs against the SAME persistent Phase-155 database without a fresh schema in between will hit duplicate-key errors from their own prior run's leftover rows. This is a pre-existing characteristic of the shared, non-isolated fixture family (accepted per the plan's own threat register entry T-185-06-01), not a regression introduced by this plan's renumbering — confirmed by running the full combined suite against a freshly-restored database, which passes cleanly every time.

## Self-Check: PASSED

- `backend/internal/repository/fansub_public_group_display_url_test.go` — FOUND
- `backend/internal/repository/group_release_version_count_test.go` — FOUND
- `backend/internal/handlers/search_bypass_integration_test.go` — FOUND
- `backend/internal/handlers/search.go` — FOUND
- `backend/internal/handlers/search_test.go` — FOUND
- Commit `ff82eef84` — FOUND in git log
- Commit `36215894c` — FOUND in git log
- Commit `457a40f03` — FOUND in git log

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*
