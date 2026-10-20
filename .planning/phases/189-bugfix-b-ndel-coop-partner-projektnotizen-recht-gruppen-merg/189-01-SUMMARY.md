---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 01
subsystem: api
tags: [go, pgx, postgres, openapi, release-versions, fansub-groups]

# Dependency graph
requires: []
provides:
  - "coop_groups field on GroupReleaseListCursorResponse / GroupReleasesCursorPage, populated by a new getCoopGroups self-join over release_version_groups"
  - "OpenAPI documentation for both coop_groups (new) and other_groups (pre-existing drift fix) on GroupReleaseListCursorResponse"
affects: [189-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling-file repository extension when the host file is already at the 450-line limit (group_repository_coop.go next to group_repository.go, mirrors group_repository_cursor.go's own precedent)"
    - "Self-join over a junction table (release_version_groups) to express 'shares at least one row with' instead of a per-row/per-episode join shape"

key-files:
  created:
    - backend/internal/repository/group_repository_coop.go
    - backend/internal/repository/group_repository_coop_test.go
  modified:
    - backend/internal/repository/group_repository_cursor.go
    - shared/contracts/openapi.yaml

key-decisions:
  - "coop_groups is additive only to GetGroupReleasesCursor (the Cursor endpoint the project page actually calls) -- GetGroupReleases (Offset endpoint) is explicitly untouched per D-04"
  - "getCoopGroups lives in a new sibling file, not inside group_repository.go (already 454 lines, at the project's 450-line limit) -- avoids an unrelated file split in a bugfix plan"
  - "Fixed the pgx 'multiple commands in a prepared statement' pitfall by issuing one INSERT per pool.Exec call in test fixtures (parameterized multi-statement strings are not supported by pgx's extended protocol)"

requirements-completed: [D-04]

# Metrics
duration: ~27min (12:02-12:29 UTC, test commit to final verification)
completed: 2026-10-20
---

# Phase 189 Plan 01: Coop-Partner Backend (coop_groups) Summary

**New `getCoopGroups` self-join on `release_version_groups` adds a correctly-scoped `coop_groups` field to the Cursor release-list endpoint, live-verified against real production data (anime 4/group 29 → "Project Messiah").**

## Performance

- **Duration:** ~27 min (test-commit to contract-commit)
- **Started:** 2026-10-20T12:02:32Z
- **Completed:** 2026-10-20T12:14:10Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `getCoopGroups(ctx, animeID, groupID)` returns only fansub groups that share at least one `release_version_id` with the requesting group on this anime (a true self-join on `release_version_groups`), as opposed to `getOtherGroups`'s existing "any release on this anime" set.
- `GetGroupReleasesCursor`'s `GroupReleasesCursorPage` now carries `CoopGroups []models.FansubGroupSummary` (`json:"coop_groups"`) alongside the pre-existing `OtherGroups`. The Offset endpoint `GetGroupReleases` is byte-identical to before this plan (D-04 scope boundary).
- Three real-Postgres tests prove: (1) two groups sharing a release_version are mutual coop partners, (2) a group with its own separate release on the same anime is excluded from `coop_groups` but still present in `other_groups` (closing RESEARCH.md Pitfall 4 at the data layer), (3) the full `GetGroupReleasesCursor` call populates `coop_groups` correctly, not just the standalone function.
- `shared/contracts/openapi.yaml`'s `GroupReleaseListCursorResponse` now documents both `coop_groups` (new) and `other_groups` (pre-existing drift, the Go struct already returned it but the contract never listed it) -- the unrelated `GroupReleasesData` Offset-endpoint schema is untouched.
- Live-verified against the running backend after `docker compose up -d --build team4sv30-backend`: `GET /api/v1/anime/4/group/29/release-list` returns `coop_groups: [{"id": 30, "slug": "project-messiah", ...}]`, matching a real shared-release pair found via direct SQL inspection of `release_version_groups`.

## Task Commits

Each task was committed atomically (Task 1 followed the TDD RED/GREEN cycle since `tdd="true"`):

1. **Task 1 (RED): add failing real-Postgres test for coop_groups** - `9d0a37d0e` (test)
2. **Task 1 (GREEN): coop_groups self-join on GetGroupReleasesCursor** - `ad7ba7a0f` (feat)
3. **Task 2: OpenAPI contract fix for GroupReleaseListCursorResponse** - `31fc83131` (docs)

_No plan-metadata commit yet -- STATE.md/ROADMAP.md updates follow this SUMMARY._

## Files Created/Modified
- `backend/internal/repository/group_repository_coop.go` - new `getCoopGroups` self-join query, mirrors `getOtherGroups`'s error-wrap/scan-loop idiom
- `backend/internal/repository/group_repository_coop_test.go` - real-Postgres fixture (`openGroupRepositoryCoopFixture`, extends the Phase-107 base with the full join chain `GetGroupReleasesCursor` needs: media/visibility/review-status/variant/notes/contribution/theme stand-ins) plus 3 tests
- `backend/internal/repository/group_repository_cursor.go` - `GroupReleasesCursorPage.CoopGroups` field + wiring call in `GetGroupReleasesCursor` (303 lines, under the 320-line acceptance ceiling)
- `shared/contracts/openapi.yaml` - `coop_groups` + `other_groups` added to `GroupReleaseListCursorResponse`

## Decisions Made
- Followed the plan's interface spec exactly for the SQL shape (self-join two aliases of `release_version_groups` on equal `release_version_id` / unequal `fansub_group_id`), and for the error-wrap strings.
- Extended the test fixture significantly beyond the plan's literal "copy the stand-in SQL block verbatim" instruction for Test 3 specifically: the plan assumed the minimal `anime/episodes/fansub_releases/release_versions/release_version_groups` fixture would suffice for a full `GetGroupReleasesCursor` call, but that query also joins `media_assets`/`media_files`/`visibilities`/`review_statuses`/`release_variants`/`release_version_media`/`release_version_notes` (thumbnail/images/duration/notes-count subqueries), `anime_contributions`/`anime_contribution_roles`/`members` (`loadPublicEffectiveContributors`), and `theme_types`/`themes`/`theme_segments`/`theme_segment_assignments` (`attachReleaseTimelineSegments`) -- all of which must exist in the schema (even with zero rows) for Postgres to plan the query at all. Verified every added column against the live `team4s_v2` schema via `docker compose exec team4sv30-db psql -d team4s_v2 -c "\d <table>"` before writing the trimmed stand-in DDL, following the same "real column names, trimmed to what's used" convention as `phase182_postgres.go`/`phase187_postgres.go`. This was necessary to make Test 3 (an explicitly required must-have proof) actually exercise real behavior rather than fail on a missing relation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] pgx rejects multi-statement parameterized Exec calls**
- **Found during:** Task 1 (RED phase), first test run
- **Issue:** Test fixtures originally issued one `pool.Exec` call per test case containing several semicolon-separated `INSERT` statements with `$N` placeholders. pgx v5's extended query protocol (used automatically when params are passed) only supports a single command per `Exec` call -- this is `cannot insert multiple commands into a prepared statement (SQLSTATE 42601)`, not a logic bug in the SQL itself.
- **Fix:** Split each multi-statement, parameterized block into one `pool.Exec` call per `INSERT` statement, matching the pattern already used by `release_version_group_guard_test.go` and other real-Postgres fixtures in this package.
- **Files modified:** `backend/internal/repository/group_repository_coop_test.go`
- **Verification:** All 3 tests pass after the split; confirmed via a direct `go test -run ... -v` inside the same `golang:1.25-alpine` container the sanctioned `scripts/test-backend.sh` uses.
- **Committed in:** `ad7ba7a0f` (part of the GREEN commit, since the RED commit still had the broken fixture by design -- RED failed on the undefined symbols, not yet on this runtime issue, which only surfaced once compilation succeeded).

**2. [Rule 3 - Blocking issue] `episodes.title` column missing for Test 3's full-query path**
- **Found during:** Task 1 (GREEN phase), second test run
- **Issue:** `publicReleaseTitleSQL`'s episode-title fallback expression references `e.title`, which the fixture's `episodes` stand-in table did not define -- `column e.title does not exist (SQLSTATE 42703)`.
- **Fix:** Added a `title TEXT` column to the fixture's `episodes` table definition.
- **Files modified:** `backend/internal/repository/group_repository_coop_test.go`
- **Verification:** Test 3 passes after the fix; full `scripts/test-backend.sh` run confirms `GATE: GREEN (0)`.
- **Committed in:** `ad7ba7a0f`

---

**Total deviations:** 2 auto-fixed (both Rule 3, test-fixture-only -- no product-code behavior was changed to make a test pass, consistent with the phase's hard constraint).
**Impact on plan:** Both fixes were necessary purely to make the already-correct test *intent* actually executable against real Postgres. No scope creep into product code; the fixture extension (deviation documented above, not a "Rule" auto-fix since it was required to make the plan's own Test 3 runnable at all) is the larger, pre-planned addition.

## Issues Encountered
None beyond the two auto-fixed test-fixture issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 189-02 (frontend coop-partner UI) can now consume `coop_groups` from `GET /api/v1/anime/:id/group/:groupId/release-list` directly -- the field is live, contract-documented, and verified against real production data (anime 4/group 29 ↔ 30, "Project Messiah").
- No blockers. `other_groups` behavior and the Offset endpoint (`GetGroupReleases`, used by `releases/page.tsx` and other non-project-page consumers) are provably untouched (acceptance-criteria grep + live curl both confirm).

## Self-Check: PASSED

- FOUND: backend/internal/repository/group_repository_coop.go
- FOUND: backend/internal/repository/group_repository_coop_test.go
- FOUND: .planning/phases/189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg/189-01-SUMMARY.md
- FOUND commit: 9d0a37d0e (test, RED)
- FOUND commit: ad7ba7a0f (feat, GREEN)
- FOUND commit: 31fc83131 (docs, contract)
- FOUND commit: 82ae81c17 (docs, summary)

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*
