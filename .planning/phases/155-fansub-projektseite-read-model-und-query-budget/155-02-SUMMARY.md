---
phase: 155-fansub-projektseite-read-model-und-query-budget
plan: 02
subsystem: api
tags: [go, gin, pgx, postgres, openapi, typescript]

# Dependency graph
requires: []
provides:
  - "GroupRepository.GetGroupReleaseVersionCount(ctx, animeID, groupID, filter) (int64, error) — standalone COUNT(DISTINCT rev.id)"
  - "GET /api/v1/anime/:id/group/:groupId/releases/count backend contract"
  - "getGroupReleaseCount(animeID, groupID) frontend client function"
affects: [155-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract-in-place: existing internal countQuery lifted into a standalone method without touching the function it was extracted from"
    - "Reuse of the Plan-155-01 DSN-gated Postgres scaffold (openPhase155Postgres/mustExecPhase155) for a new, unrelated test in the same package, instead of a third scaffold variant"

key-files:
  created:
    - backend/internal/repository/group_release_version_count_test.go
  modified:
    - backend/internal/repository/group_repository.go
    - backend/internal/handlers/group_contributors_handler.go
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/group.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "group_repository_test.go's setupTestRepo/createTestAnime helpers (test_helpers.go) unconditionally call t.Skip and never execute against a real database in this environment; used the Plan-155-01 DSN-gated team4s_phase155_test scaffold instead (openPhase155Postgres/mustExecPhase155, same package, no redefinition needed), per the plan's explicit fallback instruction."
  - "Handler zero-value-filters (models.GroupReleasesFilter{}) rather than parsing query params on the count route — this endpoint deliberately does not support has_op/has_ed/has_karaoke/q filtering, matching the plan's action text."
  - "OpenAPI path/param naming follows the file's existing {animeId}/{groupId} convention (all 14 sibling anime/group paths use {animeId}, not {id}) rather than the plan text's literal '{id}' shorthand, which refers to the Go route param name (:id), not the OpenAPI path template."

requirements-completed: [P155-07, P155-08, P155-09, P155-12, P155-15]

# Metrics
duration: 24min
completed: 2026-09-11
---

# Phase 155 Plan 02: Release Count Endpoint Summary

**New `GetGroupReleaseVersionCount` repository method and `GET /api/v1/anime/:id/group/:groupId/releases/count` endpoint answer "how many release versions exist" with one COUNT query, proven byte-identical to the legacy per-release-version row count for a seeded multi-version (v2/fix) episode — not the rejected distinct-episode substitute.**

## Performance

- **Duration:** 24 min
- **Tasks:** 3/3 completed
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- `GroupRepository.GetGroupReleaseVersionCount` extracts the exact `COUNT(DISTINCT rev.id)` query `GetGroupReleases` already computes internally (lines 165-178), reusing `buildReleasesWhere` unchanged. `GetGroupReleases` and `getGroupStats` are byte-unchanged — verified via `git diff`, the new method is a pure append between existing functions.
- Two real-Postgres tests (against the disposable `team4s_phase155_test` database from Plan 155-01) prove: (a) for a multi-version episode (episode with v1+v2, plus a second single-version episode), the new count (3) matches `GetGroupReleases`'s legacy row count exactly, and explicitly asserts it does NOT equal the distinct-episode count (2) that `group.stats.episode_count` would have produced; (b) a plain single-version case also matches (1 == 1), as a non-diverging baseline.
- `GroupPublicHandler.GetGroupReleaseCount` handler + `GET /api/v1/anime/:id/group/:groupId/releases/count` route, registered next to the existing `release-list` cursor route — no new constructor wiring (`groupReleasesRepo` already attached via the existing `.WithGroupReleasesRepo(groupRepo)` call from Plan-context wiring).
- Backend rebuilt (`docker compose up -d --build team4sv30-backend`) and live-verified: `curl .../anime/1/group/1/releases/count` returns `{"data":{"count":13}}` (200); an unmatched anime/group pair returns `{"data":{"count":0}}` (200, no existence gate — this is a pure count query by design, matching the plan's handler spec); the sibling `/releases/:releaseVersionId` route (404 for a bogus numeric id) proves gin correctly disambiguates the new static `count` path segment from the existing wildcard param at the same route depth.
- OpenAPI path `/api/v1/anime/{animeId}/group/{groupId}/releases/count` (200/400/500) plus `GroupReleaseCount`/`GroupReleaseCountResponse` schemas; frontend `GroupReleaseCount`/`GroupReleaseCountResponse` types and `getGroupReleaseCount(animeID, groupID)` client function mirror `getGroupDetail`'s `authorizedFetch` shape.
- `tsc --noEmit`, `eslint` on the two touched frontend files, and the existing `api.test.ts` suite (8 tests) all pass clean. No frontend page calls the new endpoint yet — wiring is 155-04's job per the plan's explicit scope boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract standalone GetGroupReleaseVersionCount + old/new count-parity test** - `f8a41311` (feat)
2. **Task 2: Handler method + route wiring for the release count endpoint** - `5ffb3c16` (feat)
3. **Task 3: Frontend contract parity — type + api.ts client function** - `23176cad` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md update)

## Files Created/Modified

- `backend/internal/repository/group_repository.go` - added `GetGroupReleaseVersionCount`, appended after `publicReleaseVersionLabelSQL`, before `getOtherGroups`; 442 lines total (within the 450-line ceiling)
- `backend/internal/repository/group_release_version_count_test.go` (NEW) - two real-Postgres tests reusing the Plan-155-01 `openPhase155Postgres`/`mustExecPhase155` DSN scaffold; seed helpers for episodes/releases/release_versions/release_version_groups
- `backend/internal/handlers/group_contributors_handler.go` - added `GetGroupReleaseCount` handler, added `models` import; 367 lines total
- `backend/cmd/server/main.go` - registered `GET /anime/:id/group/:groupId/releases/count` next to the existing `release-list` route
- `shared/contracts/openapi.yaml` - new path block + `GroupReleaseCount`/`GroupReleaseCountResponse` schemas
- `frontend/src/types/group.ts` - `GroupReleaseCount`, `GroupReleaseCountResponse`, placed next to `GroupReleasesResponse`
- `frontend/src/lib/api.ts` - `getGroupReleaseCount(animeID, groupID)`, import added alongside existing `@/types/group` imports

## Decisions Made

- Confirmed and used the plan's documented fallback: `group_repository_test.go`'s `setupTestRepo`/`createTestAnime` (in `test_helpers.go`) both unconditionally call `t.Skip`, so the tests in that file never actually run against a real database in this environment despite superficially looking like a "non-DSN-gated fixture convention." Used the Plan-155-01 `TEAM4S_PHASE155_TEST_DSN`/`team4s_phase155_test` scaffold instead (already defined in `fansub_project_resolver_query_budget_test.go`, same package — reused directly, no redefinition).
- OpenAPI path/parameter naming: the plan's action text says "integer path params `id`/`groupId`" — that describes the Go route's `:id`/`:groupId` param names. All 14 existing sibling `/api/v1/anime/{...}/group/{groupId}/...` OpenAPI paths in this file use `{animeId}`, not `{id}`, as the path template variable name. Followed the file's existing convention (`{animeId}`) rather than the plan text's literal shorthand, to stay consistent with every neighboring path.

## Deviations from Plan

None beyond the two decisions documented above (both are direct applications of the plan's own "check first, mirror whichever convention" instruction and its "matching the neighboring path's shape" instruction — not scope changes).

## Issues Encountered

None. `go build ./...`, `go vet ./...`, and `go test ./internal/handlers/...` all clean; the pre-existing `TestPhase128*`/`TestPhase134Matrix*` DSN/live-backend-dependent failures noted in 155-01-SUMMARY.md are unrelated to this plan's files and were not touched.

## Requirements Tracking Note

`requirements.mark-complete P155-07 P155-08 P155-09 P155-12 P155-15` returned `not_found` for all
five IDs — `.planning/REQUIREMENTS.md` has no `P155-*` section, the same phase-crossing gap
155-01-SUMMARY.md already documented. Not fixed here for the same reason 155-01 gave: no
established Phase-155 precedent in that file to follow without inventing a section format
unilaterally. Flagged for the phase-level verifier/closeout.

## User Setup Required

None — the `team4s_phase155_test` database this plan's tests use is the same disposable artifact provisioned during Plan 155-01; test rows seeded during this plan's runs were cleaned up (groups 1550400/1550500 and their anime/episode/release rows removed) so reruns remain idempotent.

## Next Phase Readiness

- The release-count contract (backend route + repository method + OpenAPI + TS types + `api.ts`) is complete and live-verified end-to-end.
- `projectPageData.ts`'s `per_page: 100` removal and wiring the new `getGroupReleaseCount` call into `ProjectStats` is 155-04's job, per this plan's explicit "frontend loader is NOT wired to call this yet" scope boundary.

---
*Phase: 155-fansub-projektseite-read-model-und-query-budget*
*Completed: 2026-09-11*

## Self-Check: PASSED

Verified `backend/internal/repository/group_release_version_count_test.go` exists on disk.
Verified all 3 task commit hashes (`f8a41311`, `5ffb3c16`, `23176cad`) present in `git log --oneline`.
