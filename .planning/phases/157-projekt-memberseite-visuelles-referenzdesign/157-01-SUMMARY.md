---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 01
subsystem: backend
tags: [go, postgres, pgx, openapi, contract-parity, project-member]

# Dependency graph
requires: []
provides:
  - "ProjectMemberCounts.Episodes (Go DTO), populated by a new countEpisodes repository method"
  - "episodes field in shared/contracts/openapi.yaml ProjectMemberCounts schema"
  - "episodes: number on frontend/src/types/projectMember.ts ProjectMemberCounts"
  - "Real-Postgres integration test proving UNION/DISTINCT dedup semantics for the episode count"
  - "Handler-level httptest proving episodes serializes in the real GetSummary JSON response"
affects: [157-02, 157-03, 157-04, 157-05, 157-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bundled UNION count query hoisting a shared WITH-CTE above two UNION branches (projectMemberUserIDsCTE cannot live inside a UNION sub-select)"
    - "Local fixture augmentation in a new integration test file instead of editing shared testsupport/phase117_postgres.go"

key-files:
  created:
    - backend/internal/repository/project_member_public_repository_episodes_integration_test.go
  modified:
    - backend/internal/repository/project_member_public_repository.go
    - backend/internal/handlers/project_member_public_handler_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/projectMember.ts

key-decisions:
  - "countEpisodes is one additional QueryRow in GetSummary's existing sequential count block, built from the note branch (countNotes' FROM/JOIN chain, selecting e.id instead of COUNT(*)) UNIONed with the media branch (countMedia's FROM/JOIN chain, same substitution), with projectMemberUserIDsCTE hoisted to a single leading WITH above both branches instead of countMedia's own now-redundant WITH"
  - "New integration test file is package repository, separate from the legacy os.ReadFile+strings.Contains-style project_member_public_repository_test.go, so no source-assertion-style test gained a new sibling"
  - "Test DSN database team4s_phase117_test_156 (pre-existing, already matching ^team4s_phase117_test_[a-z0-9]+$) reused rather than provisioning a new one, since testsupport.OpenPhase117Postgres schema-isolates each test run within a shared database"

requirements-completed: [P157-04, P157-11]

# Metrics
duration: 35min
completed: 2026-09-12
---

# Phase 157 Plan 01: Backend episodes count + contract parity Summary

**Additive `countEpisodes` union-of-notes-and-media count wired into ProjectMemberCounts, proven against real Postgres (3/2/2 union/dedup fixture) and against a real HTTP response, with Go/OpenAPI/TypeScript contract parity.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-12T18:05:00Z (approx, based on STATE.md handoff)
- **Completed:** 2026-09-12
- **Tasks:** 3/3 completed
- **Files modified:** 4 modified, 1 created

## Accomplishments
- `ProjectMemberCounts.Episodes` now exists and is populated by a new `countEpisodes` repository method reusing `projectMemberPublicNotePredicate`, `projectMemberPublicMediaPredicate`, and `projectMemberUserIDsCTE` verbatim — no parallel business-logic path.
- A real-Postgres integration test (4-episode fixture: note-only, media-only, both, neither-public) proves `countEpisodes == 3`, `countNotes == 2`, `countMedia == 2` — the union count is neither additive nor equal to either individual count, and non-public rows are fully excluded.
- Full contract parity across Go DTO, `shared/contracts/openapi.yaml`, and `frontend/src/types/projectMember.ts` — Wave 2 frontend plans can consume `episodes` immediately.
- A handler-level httptest (`TestProjectMemberGetSummary_ReturnsEpisodesCount`) proves the field genuinely serializes in the real `GetSummary` JSON response body, not just that the struct field exists.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement countEpisodes and prove it against real Postgres** - `65979302` (feat)
2. **Task 2: Contract parity — openapi.yaml and frontend ProjectMemberCounts** - `d034866c` (docs)
3. **Task 3: Prove the field flows through the public HTTP response** - `84d48e1c` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified
- `backend/internal/repository/project_member_public_repository.go` - Added `Episodes int` field to `ProjectMemberCounts`, added `countEpisodes` private method (single bundled UNION/DISTINCT query), wired into `GetSummary`'s sequential count block
- `backend/internal/repository/project_member_public_repository_episodes_integration_test.go` - New real-Postgres integration test with a 4-episode fixture (A: note-only, B: media-only, C: both, D: neither-public), proving union/dedup semantics; local fixture augmentation (users/app_users/member_claims/visibilities/review_statuses/media_assets columns/release_version_media) inside the test file itself, no changes to shared testsupport
- `backend/internal/handlers/project_member_public_handler_test.go` - Added `summaryEpisodes` field to `recordingProjectMemberLoader`, wired it into the mock `GetSummary` return value, added `TestProjectMemberGetSummary_ReturnsEpisodesCount` using `encoding/json` to decode the real recorder body
- `shared/contracts/openapi.yaml` - Added `episodes: {type: integer, format: int32}` to `ProjectMemberCounts` schema properties and `required` array
- `frontend/src/types/projectMember.ts` - Added `episodes: number` to the `ProjectMemberCounts` interface

## Decisions Made
- Reused the pre-existing `team4s_phase117_test_156` database for the DSN rather than creating a new phase-117-pattern database, since `OpenPhase117Postgres` schema-isolates each test run inside a shared database and the database-name regex only cares about the database, not the schema.
- Kept the new integration test file's helper closures (`insertNote`, `insertMedia`) local and un-exported rather than promoting them to a shared test-fixture package, matching the plan's explicit "local fixture augmentation" precedent from `release_detail_public_repository_segment_credits_test.go`.

## Deviations from Plan

None — plan executed exactly as written. All three tasks, their `<action>`/`<acceptance_criteria>`/`<verify>` blocks, and the plan-level `<verification>`/`<success_criteria>` sections were followed without any Rule 1-4 fixes needed.

## Known Stubs

None — this plan is purely additive backend/contract work; no UI stub surfaces were touched.

## Threat Flags

None — the new `countEpisodes` query reuses the existing three public-visibility predicate constants verbatim (per the plan's own `<threat_model>` T-157-01 disposition) and introduces no new trust boundary, endpoint, or schema change. The plan's threat register already covered this surface.

## Verification Results

- `go build ./...` — clean
- `go vet ./...` — clean
- `go test ./internal/handlers/... -run TestProjectMember -v` — 9/9 subtests pass, including the new `TestProjectMemberGetSummary_ReturnsEpisodesCount`
- `go test ./internal/repository/... -run TestProjectMemberEpisodes -v` (golang:1.25-alpine container on `team4s_default` network, DSN `team4s_phase117_test_156`, password derived from `docker exec team4sv30-backend env | grep DATABASE_URL`) — `TestProjectMemberEpisodesCountUnionDedup` passes, confirming `countEpisodes == 3`, `countNotes == 2`, `countMedia == 2`
- `docker compose up -d --build team4sv30-backend` — rebuilt successfully, `/health` returns 200 after restart
- `backend/internal/repository/project_member_public_repository_test.go` (the flagged legacy source-assertion file) — untouched, confirmed via `git diff --stat` showing no changes to that file

## Self-Check: PASSED

- FOUND: backend/internal/repository/project_member_public_repository.go
- FOUND: backend/internal/repository/project_member_public_repository_episodes_integration_test.go
- FOUND: backend/internal/handlers/project_member_public_handler_test.go
- FOUND: shared/contracts/openapi.yaml (episodes property + required entry confirmed via grep)
- FOUND: frontend/src/types/projectMember.ts (episodes: number confirmed)
- FOUND commit 65979302 in git log
- FOUND commit d034866c in git log
- FOUND commit 84d48e1c in git log

## Next Steps
- Wave 2 frontend plans (157-02 through 157-06) can now consume `episodes` on `ProjectMemberCounts` without any further backend changes.
- No backend follow-up expected from this plan; the mandatory-run-constraint's "one allowed backend change" has been fully delivered.
