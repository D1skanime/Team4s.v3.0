---
phase: 158-public-anime-detail-reparatur
plan: "01"
subsystem: api
tags: [anime, postgres, contracts, regression, nextjs]
requires:
  - phase: 155
    provides: Existing pretty project route builders and numeric compatibility routes
provides:
  - Public relations visibility check with two successful data statements
  - Authoritative optional anime slug from the existing detail query
  - Aligned Go, OpenAPI and TypeScript contracts and Promise-only numeric route props
affects: [158-02, 158-04, 159]
tech-stack:
  added: []
  patterns: [SELECT EXISTS visibility check, additive stored slug projection, guarded isolated PostgreSQL fixtures]
key-files:
  created:
    - backend/internal/repository/anime_public_read_integration_test.go
    - backend/internal/handlers/anime_relations_test.go
    - frontend/src/types/__tests__/anime-detail-contract.test.ts
  modified:
    - backend/internal/repository/anime.go
    - backend/internal/repository/anime_v2.go
    - backend/internal/handlers/anime.go
    - backend/internal/models/anime.go
    - frontend/src/types/anime.ts
    - shared/contracts/openapi.yaml
    - frontend/src/app/anime/[id]/group/[groupId]/page.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx
key-decisions:
  - "Reuse the CommentRepository visibility predicate without metadata or schema queries."
  - "Project NULLIF(BTRIM(anime.slug), '') in the V2 base query; omit absent legacy slugs."
  - "Reuse the Phase106 guarded PostgreSQL fixture without application database access."
requirements-completed: [P158-07, P158-08]
duration: 13min
completed: 2026-09-13
---

# Phase 158 Plan 01: Authoritative Slugs and Lean Relations Summary

**Public relations now use two data statements; anime detail carries its stored slug without another query, and the numeric compatibility route satisfies Next's Promise params contract.**

## Execution Boundary

- Canonical repository: `/home/d1sk/team4s`, accessed via `ssh team4s-linux`.
- Phase/audit baseline: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`.
- Plan starting commit: `d8bf18cb9b4b058c6cd4274bec837f498d99f6e5`.
- Implementation end commit: `bec22420`; the subsequent docs commit contains this summary.
- Recorded start: 2026-09-13T20:24:51Z; completed: 2026-09-13T20:37:51Z.
- Tasks: 3/3. Product and test files: 11, plus this summary.
- No push. Global STATE/ROADMAP/REQUIREMENTS tracking remains the phase orchestrator's responsibility.

## Accomplishments

1. `AnimeRepository.ExistsVisible(ctx, id)` reuses the existing `status <> 'disabled'` rule in a parameterized `SELECT EXISTS`. `GetAnimeRelations` calls it instead of loading the full anime. The relations query itself is unchanged, including bidirectional deduplication and disabled target filtering. Existing 400/404/500 response messages remain.
2. `AnimeDetail.Slug *string` uses `json:"slug,omitempty"`. The V2 SELECT and Scan add `NULLIF(BTRIM(anime.slug), '')` in corresponding positions. The legacy branch omits slug. The stored value can differ from the display title; no title-derived route is fabricated.
3. TypeScript and OpenAPI mirror the optional slug. OpenAPI now documents the existing public relations endpoint, all four status branches, and the complete nullable relation payload. `GroupStoryPageProps.params` is Promise-only; numeric lookup and pretty canonical resolution are unchanged.

## Task Commits and TDD

| Task | RED commit | GREEN commit |
|---|---|---|
| 1: Relations visibility and SQL budget | `e00aca96` — test(158-01): expose relations visibility and SQL budget regression | `222a25dd` — fix(158-01): check visible anime existence without detail reload |
| 2: Stored slug projection | `77915c63` — test(158-01): require stored slug without extra detail statements | `5bdbc5e1` — feat(158-01): project authoritative anime slug from detail query |
| 3: Shared contract and numeric route props | `8de56f0d` — test(158-01): cover anime slug relations and numeric route contracts | `bec22420` — fix(158-01): align public anime contracts and Next route params |

Every new regression was executed before its product change. Task 1 failed the SQL budget on the old full reload. Task 2 failed on both nonempty stored slugs while existing absence/legacy cases passed. Task 3 failed three missing OpenAPI assertions; full typecheck also exposed missing TS slug and the explicit Promise-only assertions. No RED test was skipped.

## Measured SQL Evidence

The QueryTracer records every query through the request pool, including schema queries. Setup, connection initialization and fixture changes finish before resetting it. No schema query is silently excluded.

| Case | Before | After | HTTP |
|---|---:|---:|---:|
| Visible with relations | 8 total (1 schema + 7 data) | 2 data | 200 |
| Visible without relations | 8 total (1 schema + 7 data) | 2 data | 200, `data: []` |
| Licensed, still publicly visible | 8 total (1 schema + 7 data) | 2 data | 200 |
| Unknown | 2 total (1 schema + 1 data) | 1 data | 404 |
| Disabled | 2 total (1 schema + 1 data) | 1 data | 404 |
| Invalid, decimal, zero, negative ID | 0 | 0 | 400 |
| Visibility SQL failure | — | 1 attempted data statement | 500, `interner fehler` |
| Relations SQL failure | — | 2 attempted data statements | 500, `relationen konnten nicht geladen werden` |
| Full detail, all six slug/legacy cases | 7 total (1 schema + 6 data) | 7 total (1 schema + 6 data) | Repository success |

Full-detail coverage includes a stored slug that differs from the title, trimmed slug, empty string, whitespace, NULL, and a schema without the slug column. Existing title, ID, year, type, visibility, and episode fields remain asserted. Invalid int64 overflow is additionally covered by the handler test with a nil repository, proving it never reaches database access.

These are measured statement counts, not latency claims.

## Checks Executed

All shell commands below ran in the canonical Linux repository. Tests/build tools ran in the existing Docker containers.

- `docker compose exec -T -e TEAM4S_PHASE106_TEST_DSN=postgres://postgres:phase158-isolated-test@team4s-phase158-test:5432/team4s_phase106_test_p158?sslmode=disable team4sv30-backend go test ./internal/repository ./internal/handlers -run 'Test.*(AnimePublicRead|AnimeRelations)' -count=1 -v` — GREEN, exit 0; all new isolated database cases actually executed. Task 1's earlier RED output reported FAIL; Task 2's separate RED command exited 1.
- `docker compose exec -T -e TEAM4S_PHASE106_TEST_DSN=postgres://postgres:phase158-isolated-test@team4s-phase158-test:5432/team4s_phase106_test_p158?sslmode=disable team4sv30-backend go test ./internal/repository ./internal/handlers ./internal/models -run 'Test.*(Anime|ParseAnimeID)' -count=1` — exit 0. Models compiled, with no matching model tests.
- `docker compose exec -T team4sv30-backend go vet ./internal/repository ./internal/handlers ./internal/models` — exit 0.
- `docker compose exec -T team4sv30-backend go build ./...` — exit 0.
- `docker compose exec -T team4sv30-backend go test ./internal/handlers -run TestPhase136ContractParity -count=1` — exit 0; existing YAML parser and shared-contract parity regression pass.
- `docker compose exec -T team4sv30-frontend npm test -- src/types/__tests__/anime-detail-contract.test.ts 'src/app/anime/[id]/group/[groupId]/page.test.tsx'` — exit 0; 2 files, 24 tests passed.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — exit 0. The two baseline TS2344 errors in generated numeric-page types are resolved; both new Promise assertions and optional slug typing pass.
- `docker compose exec -T team4sv30-frontend npx eslint src/types/anime.ts src/types/__tests__/anime-detail-contract.test.ts 'src/app/anime/[id]/group/[groupId]/page.tsx' 'src/app/anime/[id]/group/[groupId]/page.test.tsx'` — exit 0, no output.
- `git diff d8bf18cb..HEAD --check` and scoped diff review — clean; no tracked file deletions.

Full frontend-suite, full lint, isolated Next production build and live browser/HTTP phase gates belong to 158-04. This plan does not report those as passed.

## Fixture Isolation and Reproduction

The test pool uses `testsupport.OpenPhase106Postgres`: explicit test DSN only, validated database-name pattern `team4s_phase106_test_[a-z0-9]+`, verified actual database, unique guarded schema/search_path, and scoped cleanup. No fallback to application `DATABASE_URL`.

The execution created a separate PostgreSQL container using:

```sh
docker run -d --rm --name team4s-phase158-test --network team4s_default \
  --tmpfs /var/lib/postgresql/data:rw \
  -e POSTGRES_DB=team4s_phase106_test_p158 \
  -e POSTGRES_PASSWORD=phase158-isolated-test postgres:16
docker exec team4s-phase158-test pg_isready -U postgres -d team4s_phase106_test_p158
```

The password is a disposable fixture value only. `docker port team4s-phase158-test` confirmed no published host port. Container ID `164ae9edb5c5b3d21948c98025595f9159c2773373d5af5dbc5a71e488e3717b` was inspected and the container removed after verification. No persistent fixture volume was created.

Backend source was copied only for the changed Go files into the existing container for Air recompilation and checks. There was no backend restart, Compose up, migration, application database write, host dependency installation, or runtime-data reset.

## Files Created/Modified

- Backend behavior: `backend/internal/repository/anime.go`, `anime_v2.go`, `backend/internal/models/anime.go`, `backend/internal/handlers/anime.go`.
- Backend regressions: `backend/internal/repository/anime_public_read_integration_test.go`, `backend/internal/handlers/anime_relations_test.go`.
- Cross-surface contract: `shared/contracts/openapi.yaml`, `frontend/src/types/anime.ts`, `frontend/src/types/__tests__/anime-detail-contract.test.ts`.
- Numeric route contract and regressions: `frontend/src/app/anime/[id]/group/[groupId]/page.tsx`, `page.test.tsx`.

## Deviations from Plan

- **Fixture choice:** Reused the existing Phase106 isolation helper instead of Phase117's migration-heavy prerequisites. Both use the same guarded database/schema isolation implementation. The custom neutral-anime fixture contains only the columns/tables the existing public reads require; no new test-support or production service abstraction was added.
- **Numeric test callers:** The existing `page.test.tsx` had no direct Page/Metadata caller to convert. Added Promise-based callers and exact compile-time type assertions in that same test file, preserving its existing tests.
- **GSD tooling:** The installed wrapper accepts legacy `init execute-phase` / `state load`, not the newer `query` prefix. Context was loaded via the supported wrapper. Global tracking was intentionally left to the orchestrator as specified by this plan.

No architectural or product-scope deviation, authentication gate, or unresolved task blocker.

## Risks, Deferred Checks and Open Human-UAT

- The phase baseline's two CSS guard test failures and full-lint 13 errors / 331 warnings remain outside this plan's scope; this plan's scoped lint is clean. The former two typecheck errors are fixed.
- The browser-visible pretty-link consumer and remaining phase work still require 158-02/158-03 and the full 158-04 gate. P158-07 here covers the server-authoritative slug and compatible route contract.
- Human-UAT 156 GAP-02's 14 origin/contributor checks and 157-06 Task 4 remain **OPEN**. Automated results here grant neither sign-off.
- Foreign edits/untracked artifacts, including `frontend/scripts/shot2.mjs`, other phase planning documents and orchestrator-owned STATE changes, were not modified or staged.
- Stub scan found no new product placeholders or unwired data. Empty arrays and NULL in the new files are intentional test cases, not product stubs.
- Threat scan found no new endpoint, auth path, media ownership, file-access boundary or schema surface; T-158-01 and T-158-02 are covered by the status/SQL and slug regressions.

## Self-Check: PASSED

All 11 implementation/test files exist. All six task commits exist and contain no tracked file deletions. Summary exists in the intended phase directory. No task remained unfinished before metadata completion.
