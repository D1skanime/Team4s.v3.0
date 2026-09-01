---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 10
subsystem: testing
tags: [go, postgres, testify, pgx, points-ledger, project-timeline]

# Dependency graph
requires:
  - phase: 143-09
    provides: dashboard_me_handler.go with zero inline SQL, the prerequisite for later Criterion-7 work (unrelated to this plan's own test-only scope, but the plan explicitly depends on 143-09 per its frontmatter)
provides:
  - first-ever test coverage for ReleaseMetadataCreditService.AwardIfCompleted, including a documented finding that its ambiguous rv.id/rev.id lookup can silently credit the wrong release version on a real ID collision
  - first fixture-backed (real-Postgres) test for UpdateAnimeFansubProjectTimeline's "end before an already-completed release" date-validation rule
  - a corrected route string in the only pre-existing handler test for the project-timeline endpoint
affects: [any future phase/quick-task that decides whether to change release_metadata_credit_service.go's WHERE rv.id = $1 OR rev.id = $1 lookup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-level Postgres fixture tests extend testsupport.OpenPhase107Postgres's minimal stub tables (members/app_users/fansub_groups/release_versions/member_claims/point_* tables) with a local, self-contained CREATE TABLE/ALTER TABLE block (anime/episodes/fansub_releases/release_variants/release_version_groups) rather than applying further production migration files, since those migrations assume tables (e.g. anime_fansub_groups) that are not part of the Phase-107 stub set."
    - "Multi-statement seed SQL (several INSERT statements in one string) must use literal values, not $-placeholders, when passed through pgx's Exec with args — the extended query protocol pgx uses whenever args are present does not support multiple commands in one query string; only single-statement calls may use placeholders."

key-files:
  created:
    - backend/internal/services/release_metadata_credit_service_test.go
    - backend/internal/repository/anime_fansub_project_timeline_repository_test.go
  modified:
    - backend/internal/handlers/admin_content_anime_project_timeline_test.go

key-decisions:
  - "Built two dedicated Postgres fixture pools (one per new test file, both extending testsupport.OpenPhase107Postgres) instead of applying further real migration files for the release/episode/anime table chain, since no existing migration creates a self-consistent stub subset without pulling in unrelated production dependencies (e.g. migration 0156 requires anime_fansub_groups, which the Phase-107 stub set does not include)."
  - "Named the primary exported test TestReleaseMetadataCreditServiceAwardIfCompleted with two t.Run subtests (AmbiguousIDCollisionCreditsTheWrongReleaseVersion, HappyPathAwardsOnceAndIsIdempotent) so the plan's required exact export name is satisfied while keeping the collision-documentation and happy-path/idempotency assertions cleanly separated."
  - "Documented the ambiguous-lookup finding in test comments and this SUMMARY rather than changing release_metadata_credit_service.go's query, per VALIDATION.md's explicit phase scoping (test-only; a future phase/quick-task decides whether the query itself needs to change)."

requirements-completed: ["Criterion-4"]

# Metrics
duration: ~45min
completed: 2026-09-01
---

# Phase 143 Plan 10: Focus Tests for AwardIfCompleted's Ambiguous Lookup and the Project-Timeline Date Rule Summary

**New Postgres-fixture tests give ReleaseMetadataCreditService.AwardIfCompleted and UpdateAnimeFansubProjectTimeline's date rule their first-ever coverage, proving (and flagging as a real defect) that the credit service's `WHERE rv.id = $1 OR rev.id = $1` lookup silently credits the wrong release version on a genuine ID collision, and fixing the one known stale-route bug in the existing 403 test.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-09-01T22:05:00Z (approx.)
- **Completed:** 2026-09-01T22:50:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `release_metadata_credit_service_test.go` gives `AwardIfCompleted` its first-ever test coverage: a constructed ID-collision fixture proves the service's `WHERE rv.id = $1 OR rev.id = $1 ORDER BY rv.id LIMIT 1` lookup silently credits `release_versions.id=500` when the caller passes literal ID `600` (intending to credit `release_versions.id=600`), because a `release_variants` row happens to share id `600` and sorts lower than the intended version's own real variant (`700`). A second subtest proves the ordinary happy path: award-once, and idempotent on a second call for the same release version.
- `anime_fansub_project_timeline_repository_test.go` gives `UpdateAnimeFansubProjectTimeline`'s "end before an already-completed release" rule its first fixture-backed (real Postgres) test: rejects a `completedOn` before the seeded latest release completion (and proves the row is not mutated on rejection), accepts a `completedOn` at or after that date, and proves the `completedOn == nil` case bypasses the rule entirely.
- `TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker` now posts to the actually-registered `/timeline` route instead of the never-registered `/project-timeline` path; the 403 assertion is unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: First test for ReleaseMetadataCreditService.AwardIfCompleted's ambiguous ID lookup** - `93f4e4dc` (test)
2. **Task 2: Fixture-based test for the project-timeline date-validation rule** - `30dc9c5e` (test)
3. **Task 3: Fix the stale /project-timeline route in the existing 403 test** - `1cfe40c0` (fix)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `backend/internal/services/release_metadata_credit_service_test.go` - new; `openReleaseMetadataCreditPool` extends `testsupport.OpenPhase107Postgres` with `anime`/`episodes`/`fansub_releases`/`release_variants`/`release_version_groups` and the `release_metadata_complete` point rule; `TestReleaseMetadataCreditServiceAwardIfCompleted` has two subtests covering the ID-collision finding and the happy-path/idempotency case
- `backend/internal/repository/anime_fansub_project_timeline_repository_test.go` - new; `openProjectTimelinePool` extends the same Phase-107 stub with `anime`/`anime_fansub_groups`/`episodes`/`fansub_releases`/`release_version_groups`; `TestUpdateAnimeFansubProjectTimelineRejectsEndBeforeCompletedRelease` has three subtests (reject-before, accept-at-or-after, nil-bypasses-rule)
- `backend/internal/handlers/admin_content_anime_project_timeline_test.go` - one-line route-string fix (`/project-timeline` → `/timeline`) in `TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker`

## Decisions Made
- Built self-contained fixture schemas for both new test files rather than reusing existing testsupport helpers (`OpenPhase117Postgres` lacks the `release_date`/`production_started_on`/`point_ledger_entries` columns and tables this plan needs; no existing repository-package pool helper covers `FansubNotesRepository`'s release-join tables). This follows the plan's own interfaces guidance ("adapt the migration filename list to what this service's tables actually need") by adapting via direct `CREATE TABLE`/`ALTER TABLE` statements instead, since no single set of production migration files applies cleanly on top of the Phase-107 stub without pulling in unrelated tables.
- Used explicit literal-value multi-statement SQL blocks for fixture seeding (matching `project_note_credit_service_test.go`'s `seedProjectNoteCreditContext` convention) rather than parameterized multi-statement `Exec` calls, since pgx's extended query protocol (used whenever `Exec` is called with args) rejects multiple commands in one query string.

## Deviations from Plan

None - plan executed exactly as written. Both new test files exist with the exact exported test names the plan's `must_haves.artifacts` required, and the route fix changed only the path string as specified.

## Documented Finding (not a deviation — the plan's own ask)

`ReleaseMetadataCreditService.AwardIfCompleted`'s `WHERE rv.id = $1 OR rev.id = $1 ORDER BY rv.id LIMIT 1` query (release_metadata_credit_service.go:43-51) checks the same numeric ID space against two different tables (`release_variants.id` and `release_versions.id`). The new `AmbiguousIDCollisionCreditsTheWrongReleaseVersion` subtest proves that when a `release_variants` row's own id collides with a *different* release version's id, the service can silently credit the wrong release version — specifically, whichever candidate row has the lower `rv.id` wins, regardless of which release version the caller actually intended. This plan's `<threat_model>` disposition (T-143-10, "accept") explicitly scopes this phase to documenting, not necessarily changing, the query; per that disposition this finding is now recorded here and in the test's own comments for a future phase or quick-task to decide whether the query needs to become unambiguous (e.g. via a dedicated `variant_id` vs `version_id` parameter instead of one overloaded `$1`).

## Issues Encountered
- Per the operational note for this phase, `team4sv30-backend`'s running container had stale file contents relative to host edits (no active `docker compose watch` sync). Verified by `docker cp`-ing each new/modified test file into the container immediately before every build/test run.
- The `TEAM4S_PHASE107_TEST_DSN` fixture database this plan's tests depend on (`testsupport.OpenPhase107Postgres`) was not set in the container's environment by default; reused the already-provisioned `team4s_phase107_test_run143` database (created by Plan 143-09, matching the required `team4s_phase107_test_[a-z0-9]+` pattern) by passing the DSN inline to each `docker compose exec` test invocation. Both new test files use schema-isolated fixtures (per-test `CREATE SCHEMA`/`DROP SCHEMA CASCADE` inside `openPhasePostgres`), so sharing this database across Plan 143-09's and this plan's test runs is safe.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both new test files pass (`go test -run <name> -v`), `go build ./...` is clean, and `gofmt -l` / `go vet` report no issues on all three touched files.
- The ambiguous-ID-lookup finding is now documented and available for a future phase/quick-task to act on (see "Documented Finding" above) — no code change to `release_metadata_credit_service.go` was made or is required by this plan.
- No blockers for the next plan in this phase.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: backend/internal/services/release_metadata_credit_service_test.go
- FOUND: backend/internal/repository/anime_fansub_project_timeline_repository_test.go
- FOUND: backend/internal/handlers/admin_content_anime_project_timeline_test.go
- FOUND commit: 93f4e4dc
- FOUND commit: 30dc9c5e
- FOUND commit: 1cfe40c0
