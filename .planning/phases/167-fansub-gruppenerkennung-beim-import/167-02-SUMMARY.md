---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 02
subsystem: api
tags: [go, postgres, pgx, repository, fansub-matching, trigram, query-budget]

# Dependency graph
requires: []
provides:
  - "resolveFansubGroupMatches(ctx, q, candidates []string) ([]models.FansubGroupMatch, error) in backend/internal/repository/fansub_group_match.go — ONE parameterized SQL query (unnest($1::text[])) resolves any number of candidates against fansub_groups.name/.slug/fansub_group_aliases.normalized_alias, byte-exact regexp_replace(lower(f_unaccent(col)),'[^a-z0-9]+','','g') normalization (D-08)"
  - "suggestSimilarFansubGroups(ctx, q, candidate, limit) ([]models.FansubGroupSuggestion, error) — separate trigram 'did you mean' query, capped at 3 (D-03)"
  - "EpisodeImportRepository.ResolveFansubGroupMatches / .SuggestSimilarFansubGroups delegating methods"
  - "models.FansubGroupMatch / FansubGroupSuggestion / LearnedFansubAlias shared result types"
  - "testsupport.OpenPhase167Postgres — isolated Phase-167 Postgres fixture (fansub_groups/fansub_group_aliases + schema-local f_unaccent), reusable by Plan 06"
affects: [167-03, 167-05, 167-06, 167-07, 167-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batch matching via unnest($1::text[]) WITH ORDINALITY + tiered CTEs (alias_hits/name_hits/slug_hits), each windowed with COUNT(*) OVER (PARTITION BY row_ord) to detect and exclude ambiguous (>1 group) matches per candidate, adapted from buildSearchFansubQuery's single-term OR-chain instead of reinvented"
    - "Exact-match and fuzzy-suggestion queries kept as two textually separate SQL statements (never folded together) to keep the equality-driven exact-match path index-friendly"
    - "Isolated per-phase Postgres fixture with a schema-local f_unaccent wrapper (byte-identical body to 0152_f_unaccent_search_path_fix.up.sql) so tests can exercise f_unaccent-dependent SQL without needing public in the pool's search_path"

key-files:
  created:
    - backend/internal/models/fansub_group_match.go
    - backend/internal/repository/fansub_group_match.go
    - backend/internal/testsupport/phase167_postgres.go
    - backend/internal/repository/phase167_fansub_match_test.go
  modified:
    - backend/internal/repository/episode_import_repository.go

key-decisions:
  - "Ambiguity handling: a candidate with zero or more than one match within its winning tier is silently absent from the result slice (not an error) — per the plan's explicit acceptance criteria, classifying ambiguous/no-match is Plan 05's UI-layer problem"
  - "Query builders (buildFansubGroupBatchMatchQuery/buildFansubGroupSuggestionQuery) return plain constant strings with no per-call templating, making them directly unit-testable without a DB or mock"
  - "MatchedAlias/MatchedAliasID are populated only when MatchedVia==\"alias\" (nil for name/slug tiers, since no alias row is involved) — needed by Plan 07/08 to call reassignFansubAlias"

requirements-completed: [REQ-167-07, REQ-167-08, REQ-167-11, REQ-167-19, REQ-167-20]

# Metrics
duration: 30min
completed: 2026-09-23
---

# Phase 167 Plan 02: Fansub-Gruppen-Batch-Matcher Summary

**Single-query batched exact-match resolver (alias/name/slug, byte-exact functional-index normalization) plus a separate trigram suggestion query for fansub group detection, proven against a real isolated Postgres database for both exact-match correctness and a constant one-query-per-call budget independent of candidate count.**

## Performance

- **Duration:** ~30 min (first commit 2026-09-23, DB build/test cycles included)
- **Tasks:** 3/3 completed
- **Files modified:** 5 (1 modified, 4 created)

## Accomplishments

- `resolveFansubGroupMatches` resolves an arbitrary-length batch of filename-derived candidate strings against `fansub_groups.name`/`.slug`/`fansub_group_aliases.normalized_alias` in **exactly one SQL query**, regardless of candidate count — measured with a real `queryCounter` against a 1-element and a 50-element candidate slice (both = 1 query), not just asserted by code inspection (D-08/D-20).
- The query's normalization expression (`regexp_replace(lower(f_unaccent(col)), '[^a-z0-9]+', '', 'g')`) is byte-identical to the production functional index defined in `0140_search_foundation.up.sql`, so the planner stays index-friendly (Pitfall 3) — adapted from `buildSearchFansubQuery`/`buildSearchFansubOrder` rather than reinvented, with the same alias > name > slug tier precedence.
- Tier ambiguity is detected via `COUNT(*) OVER (PARTITION BY row_ord)` per tier: a candidate matching more than one group within its winning tier is excluded from the result, not silently returned as an arbitrary pick.
- `suggestSimilarFansubGroups` is a textually separate, smaller trigram query (`%` operator + `similarity() DESC LIMIT`), capped server-side at 3 results regardless of caller input, kept apart from the exact-match path per RESEARCH.md's explicit guidance.
- A new isolated `testsupport.OpenPhase167Postgres` fixture stands up minimal `fansub_groups`/`fansub_group_aliases` tables mirroring the real migrations' columns/constraints exactly, plus a schema-local `f_unaccent` wrapper (byte-identical body to the production `0152` fix) so the isolated schema can run `f_unaccent`-dependent SQL without `public` in its search_path.
- Real-Postgres integration tests prove: (1) all three exact-match tiers resolve correctly including case/separator name variants, with a non-matching candidate correctly absent; (2) the one-query-per-call budget holds at both 1 and 50 candidates; (3) `fansub_group_aliases`' `UNIQUE(normalized_alias)` constraint is live and rejects a second alias with the same normalized value for a different group (D-10's "real database, not fakes only" requirement).

## Task Commits

Task 1 (auto, no TDD marker):
1. `28aba6c6` (feat): isolated Phase-167 Postgres fixture (`testsupport.OpenPhase167Postgres`).

Task 2 (`tdd="true"`), RED then GREEN:
2. `26f01462` (test): RED — `TestBuildFansubGroupBatchMatchQuery`/`TestBuildFansubGroupSuggestionQuery` fail to compile (`buildFansubGroupBatchMatchQuery`/`buildFansubGroupSuggestionQuery` undefined). Confirmed via `go build` failure inside the scratch container before any implementation existed.
3. `77c1ff94` (feat): GREEN — `resolveFansubGroupMatches`/`suggestSimilarFansubGroups`, `models.FansubGroupMatch`/`FansubGroupSuggestion`/`LearnedFansubAlias`, `EpisodeImportRepository.ResolveFansubGroupMatches`/`.SuggestSimilarFansubGroups`. Both unit tests pass.

Task 3 (auto, integration coverage on top of Task 2's file):
4. `7233cfc9` (test): real-Postgres `TestResolveFansubGroupMatches_ExactTiers`, `_ConstantQueryBudget`, `_UniquenessRespected` — all pass against the real isolated `team4s_phase167_test_1` database.

## Files Created/Modified

- `backend/internal/models/fansub_group_match.go` (39 lines, new) — `FansubGroupMatch`, `FansubGroupSuggestion`, `LearnedFansubAlias`.
- `backend/internal/repository/fansub_group_match.go` (208 lines, new) — `fansubGroupMatchQuerier`, `buildFansubGroupBatchMatchQuery`/`buildFansubGroupSuggestionQuery`, `resolveFansubGroupMatches`, `suggestSimilarFansubGroups`.
- `backend/internal/repository/episode_import_repository.go` (217 lines, was 193) — added `ResolveFansubGroupMatches`/`SuggestSimilarFansubGroups` thin delegating methods. Well under the 450-line CLAUDE.md ceiling.
- `backend/internal/testsupport/phase167_postgres.go` (96 lines, new) — `OpenPhase167Postgres`, `createPhase167Prerequisites`.
- `backend/internal/repository/phase167_fansub_match_test.go` (220 lines, new) — 2 unit tests (Task 2) + 3 real-Postgres integration tests (Task 3).

All files well under the CLAUDE.md 450-line ceiling.

## Real Postgres Commands Run (headless run, per operator instructions)

Isolated test database creation (once, not touching `team4s_v2`):
```bash
docker exec team4sv30-db psql -U team4s -d postgres -c "CREATE DATABASE team4s_phase167_test_1 OWNER team4s;"
docker exec team4sv30-db psql -U team4s -d team4s_phase167_test_1 -c "CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

Go build (scratch container, backend bind-mounted from host):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine go build ./...
```
Result: exit 0, no output (clean build).

Unit tier, no DSN set (must compile and skip cleanly, never fail):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine \
  go test ./internal/repository/... -run TestResolveFansubGroupMatches -v
```
Result: all three `TestResolveFansubGroupMatches_*` tests report `SKIP` (not `FAIL`).

Real-Postgres integration run (the hard D-10 requirement):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  -e TEAM4S_PHASE167_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase167_test_1?sslmode=disable' \
  --network team4s_default golang:1.25-alpine \
  go test ./internal/repository/... -run TestResolveFansubGroupMatches -v
```
Result:
```
=== RUN   TestResolveFansubGroupMatches_ExactTiers
--- PASS: TestResolveFansubGroupMatches_ExactTiers (0.05s)
=== RUN   TestResolveFansubGroupMatches_ConstantQueryBudget
    phase167_fansub_match_test.go:190: D-08/D-20 constant-budget gate: 1 candidate -> 1 queries; 50 candidates -> 1 queries (must be equal and constant).
--- PASS: TestResolveFansubGroupMatches_ConstantQueryBudget (0.05s)
=== RUN   TestResolveFansubGroupMatches_UniquenessRespected
--- PASS: TestResolveFansubGroupMatches_UniquenessRespected (0.04s)
PASS
ok  	team4s.v3/backend/internal/repository	0.152s
```

`go vet ./internal/repository/... ./internal/models/... ./internal/testsupport/...` — clean, no findings.

The `team4s_phase167_test_1` database and its `unaccent`/`pg_trgm` extensions were left in place after the run (isolated from `team4s_v2`, reusable by Plan 06 per the operator's instructions).

## Decisions Made

- Followed the plan's design exactly: single-query batch matcher adapted from `buildSearchFansubQuery`, kept the exact-match and fuzzy-suggestion paths as two separate SQL statements, byte-matched the production functional-index expression.
- Ambiguity within a tier (a candidate matching more than one group's alias/name/slug at the same tier) is handled via `COUNT(*) OVER (PARTITION BY row_ord)` windowing and excluded from the result entirely, consistent with the plan's "absent from the result slice" acceptance criterion — no dedicated test was required by the plan for this edge case and none was added beyond what the tier-exclusion logic itself proves structurally.
- Chose plain-constant-string query builders (`buildFansubGroupBatchMatchQuery()`/`buildFansubGroupSuggestionQuery()`) over parameterized builder functions, since neither query needs per-call SQL templating (all dynamic input is bound via `$1`/`$2`) — this made the TDD RED/GREEN unit tests trivial to write against the exact SQL text without any DB.

## Deviations from Plan

None — plan executed exactly as written. TDD RED (build failure, confirmed) then GREEN (both unit tests pass on first implementation) for Task 2; Task 1 and Task 3 required no deviations from the plan's `<action>`/`<acceptance_criteria>` sections.

## Issues Encountered

- Running the full `./internal/repository/...` test suite (not filtered to Phase-167 tests) surfaces three **pre-existing, unrelated** failure classes, logged to `deferred-items.md` per the SCOPE BOUNDARY deviation rule (not fixed, out of scope):
  1. `TestFansubRepository_PublicProfileSourceInvariants` — a legacy source-inspection test asserting a substring (`"FROM anime_media am"`) no longer present in `fansub_repository.go` since Phase 163; unrelated to fansub-group matching.
  2. Several `TEAM4S_PHASE128_TEST_DSN`-gated tests `t.Fatalf` instead of `t.Skipf` when the DSN is unset (a pre-existing convention inconsistency in an unrelated phase's test file).
  3. `TestPhase134Matrix*` tests require a live backend at `192.168.235.196:18093` and a working Keycloak grant, both unavailable inside the scratch build container used for this headless run.
- The scratch `golang:1.25-alpine` container has no bind mount of the full repo root by default (only `backend/` was mounted for build/unit-test runs); this surfaced as unrelated `open .../database/migrations/....sql: no such file or directory` errors for migration-file-reading tests when running the unfiltered suite with only `backend/` mounted — resolved for diagnosis purposes by mounting the full `/home/d1sk/team4s` root, but this is a test-environment mechanic unrelated to any Phase-167 code and does not affect the actual Phase-167 test results above (which only touch the isolated Postgres fixture, no filesystem-relative migration paths).

## User Setup Required

None for this plan's own code. The isolated `team4s_phase167_test_1` Postgres database was created as part of this execution run (see commands above) and is left in place for Plan 06's alias write-path tests to reuse, per the operator's instructions.

## Next Phase Readiness

`resolveFansubGroupMatches`/`suggestSimilarFansubGroups` and their `EpisodeImportRepository` delegating methods are ready for Plan 05 (preview-time wiring, origin-hint UI) to call with the `DeriveFansubGroupName` output from Plan 01. `models.LearnedFansubAlias` is declared but not yet consumed — Plan 06 owns the alias-learning write path that populates and persists it. `models.FansubGroupMatch.MatchedAliasID` is ready for Plan 07/08's `reassignFansubAlias` "Trotzdem umhängen" flow. The isolated `testsupport.OpenPhase167Postgres` fixture and the live `team4s_phase167_test_1` database are ready for Plan 06 to extend with additional prerequisite tables if needed (the fixture's `createPhase167Prerequisites` currently covers only `fansub_groups`/`fansub_group_aliases` plus the schema-local `f_unaccent`). No blockers.

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 4 task commit hashes
(`28aba6c6`, `26f01462`, `77c1ff94`, `7233cfc9`) verified present in `git log`.
