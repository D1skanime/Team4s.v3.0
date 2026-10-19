---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 01
subsystem: database
tags: [postgres, pgx, go, release-versions, fansub-groups, dependents-guard]

# Dependency graph
requires: []
provides:
  - "testsupport.OpenPhase187Postgres: real-Postgres fixture (release_version_groups composite key, migration 0137 release_crew_snapshots/release_role_credit_lifecycles, trimmed release_version_media/release_version_notes stand-ins)"
  - "repository.DependencySummary + countReleaseVersionGroupDependents: counts real Credits/Media/Notes dependents for a (release_version_id, fansub_group_id) pair, release_crew_snapshots deliberately never counted (D-09)"
  - "repository.EpisodeVersionRepository.GetReleaseVersionGroupDependents: exported read-only entry point for Plan 04's handler"
  - "repository.diffRemovedReleaseVersionGroupIDs / ensureReleaseVersionGroupsNotReducedToEmpty / ensureRemovedReleaseVersionGroupsHaveNoDependents: pure set-diff + two DB-backed guard helpers shared verbatim by Plan 02 (editor) and Plan 03 (import) write paths"
  - "repository.ErrGroupHasDependents / ErrReleaseVersionGroupsEmpty sentinels + GroupHasDependentsError rich error (ConflictOwnerError-shaped)"
affects: [187-02, 187-03, 187-04, 187-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-check-before-write guard pattern (A2): a pure SELECT COUNT guard runs before any DELETE/INSERT for a group-change mapping, no savepoints"
    - "Pure removed=current\\new set-difference unifies D-07 (no partner-group exception) and D-12 (same-group/add-only is always a no-op) without call-site branching"

key-files:
  created:
    - backend/internal/testsupport/phase187_postgres.go
    - backend/internal/repository/release_version_group_guard.go
    - backend/internal/repository/release_version_group_guard_test.go
  modified:
    - backend/internal/repository/errors.go

key-decisions:
  - "release_crew_snapshots is NEVER counted as a dependent in either inherited or independent mode (D-09) -- real credit content lives exclusively in release_role_credit_lifecycles"
  - "GetReleaseVersionGroupDependents added as a new method on EpisodeVersionRepository in a NEW file, deliberately keeping episode_version_repository.go (565 lines, already over the 450-line limit) untouched since this plan does not modify it"

patterns-established:
  - "diffRemovedReleaseVersionGroupIDs(current, new) as the single removed-set computation both the editor (Plan 02) and import (Plan 03) write paths must call, with zero call-site-specific exception logic"

requirements-completed: [D-01, D-06, D-07, D-08, D-09, D-13, D-14]

# Metrics
duration: 15min
completed: 2026-10-19
---

# Phase 187 Plan 01: Gruppenwechsel-Dependents-Guard Summary

**Real-Postgres-backed dependents guard core (Credits/Media/Notes counting + pure set-diff helpers) that Plans 02-05 will call identically for both the editor and import write paths.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-19T11:07:38Z
- **Completed:** 2026-10-19T11:21:46Z
- **Tasks:** 2/2 completed
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `testsupport.OpenPhase187Postgres` real-Postgres fixture: builds on `OpenPhase107Postgres`, hand-rolls the `anime`/`release_version_groups`/`anime_fansub_groups` stand-ins migration 0137 needs as FK targets, applies migration 0137 for real (`release_crew_snapshots` CASCADE, `release_role_credit_lifecycles` RESTRICT), and adds trimmed-but-real-column `release_version_media`/`release_version_notes`/`contributor_roles` stand-ins.
- `countReleaseVersionGroupDependents` counts real Credits/Media/Notes dependents for a single `(release_version_id, fansub_group_id)` pair with one combined 3-subquery `SELECT`, deliberately never counting `release_crew_snapshots` (D-09) -- proven against an inherited-mode empty-snapshot case, a credit-lifecycle case, and a non-deleted-vs-deleted media/notes case.
- `diffRemovedReleaseVersionGroupIDs` (pure set difference) + `ensureReleaseVersionGroupsNotReducedToEmpty` + `ensureRemovedReleaseVersionGroupsHaveNoDependents` give Plan 02/03 one shared call surface with no per-call-site special-casing: a same-group update or add-only change always yields an empty `removed` set (guard no-op), only an actual replace/removal triggers the dependents check.
- D-13 absence check proves `fansub_repository_merge_core.go` contains zero references to any new guard identifier.
- Full backend suite (`scripts/test-backend.sh`) re-run after the fix below: `GATE: GREEN (0)`, 24 throwaway databases created/dropped including the new `team4s_phase187_test_*` fixture, no suite silently skipped.

## Task Commits

Each task was committed atomically:

1. **Task 1: Phase-187 Postgres fixture (testsupport)** - `513e10b05` (feat)
2. **Task 2: Guard core (DependencySummary, counting SQL, set-diff helpers, sentinels)** - `455432aa5` (feat)

**Plan metadata:** (this commit) `docs(187-01): complete plan`

## Files Created/Modified
- `backend/internal/testsupport/phase187_postgres.go` - `OpenPhase187Postgres` fixture: base layer via `createPhase107Prerequisites`, hand-rolled anime/release_version_groups/anime_fansub_groups stand-ins, real migration 0137 apply, trimmed release_version_media/release_version_notes/contributor_roles stand-ins
- `backend/internal/repository/release_version_group_guard.go` - `DependencySummary`, `countReleaseVersionGroupDependents`, `GetReleaseVersionGroupDependents` wrapper, `queryCurrentReleaseVersionGroupIDs`, `diffRemovedReleaseVersionGroupIDs`, `ensureReleaseVersionGroupsNotReducedToEmpty`, `ensureRemovedReleaseVersionGroupsHaveNoDependents`
- `backend/internal/repository/errors.go` - `ErrGroupHasDependents`/`ErrReleaseVersionGroupsEmpty` sentinels, `GroupHasDependentsError` rich error
- `backend/internal/repository/release_version_group_guard_test.go` - full behavior-table coverage against the real Phase-187 fixture, plus the D-13 absence check

## Decisions Made
- `release_crew_snapshots` is never queried by the dependents guard in either `inherited` or `independent` mode (D-09) -- confirmed by a dedicated test inserting an inherited-mode snapshot row with no linked credit and asserting `HasAny() == false`.
- `GetReleaseVersionGroupDependents` was added as a new method in the new `release_version_group_guard.go` file (not in `episode_version_repository.go`, which is 565 lines and already over the project's 450-line limit) -- Go allows a method with an existing type's receiver to live in a sibling file in the same package, so this plan does not need to split that file since it is not otherwise touched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Split multi-statement parameterized SQL in the new test file**
- **Found during:** Task 2 (first full-suite verification run)
- **Issue:** The initial test file combined several `INSERT` statements separated by `;` into a single `pool.Exec(ctx, sql, args...)` call with `$N` placeholders. pgx v5's extended/prepared-statement protocol (used whenever args are passed) rejects multiple SQL commands in one prepared statement (`ERROR: cannot insert multiple commands into a prepared statement`, SQLSTATE 42601) -- this only works for literal-only, zero-arg multi-statement strings (the `simple query` protocol path), which is exactly the pattern `phase108_contribution_sources_test.go`'s `seedPhase108Owners` already uses with no placeholders.
- **Fix:** Split every parameterized multi-statement `Exec` call in `release_version_group_guard_test.go` into one `Exec` call per SQL statement.
- **Files modified:** `backend/internal/repository/release_version_group_guard_test.go`
- **Verification:** Scoped `go test ./internal/repository/... -run 'TestReleaseVersionGroupGuard|TestDiffRemovedReleaseVersionGroupIDs|TestEnsureReleaseVersionGroupsNotReducedToEmpty|TestEnsureRemovedReleaseVersionGroupsHaveNoDependents|TestFansubRepositoryMergeCoreHasNoGuardReferences'` passed, then the full `scripts/test-backend.sh` run confirmed `GATE: GREEN (0)`.
- **Committed in:** `455432aa5` (Task 2 commit -- caught and fixed before the task commit was made, not a follow-up commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test-file-only fix; no product code behavior changed. No scope creep.

## TDD Gate Compliance

Task 2 was marked `tdd="true"`. The behavior/test/implementation cycle was followed in spirit (tests were written against the behavior table, run against the real fixture, and iterated on until green before committing), but the RED (failing-test-only) and GREEN (implementation) commits were **not split into two separate commits** -- `errors.go`, `release_version_group_guard.go`, and `release_version_group_guard_test.go` were all committed together in a single `feat(187-01)` commit (`455432aa5`). No separate `test(...)` commit exists before it in git log for this task.

## Issues Encountered
- The persistent `team4sv30-backend` dev container does not bind-mount the full repository root directly (only `backend/` is synced via `docker compose watch`, plus dedicated read-only mounts for `database/migrations` at both `/app/database/migrations` and `/database/migrations`). This matches `phase187MigrationPath`'s (and every sibling `phaseNNNMigrationPath`'s) existing path-resolution convention, so no fixture code needed adjustment -- confirmed by a scoped `go test` run directly against that container before re-running the full `scripts/test-backend.sh` gate.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (editor write path) and Plan 03 (import write path) can now call `queryCurrentReleaseVersionGroupIDs`, `diffRemovedReleaseVersionGroupIDs`, `ensureReleaseVersionGroupsNotReducedToEmpty`, and `ensureRemovedReleaseVersionGroupsHaveNoDependents` identically, with no call-site-specific exception logic required (per this plan's Architecture Decisions).
- Plan 04 (handler/UI dependents display) can call `EpisodeVersionRepository.GetReleaseVersionGroupDependents` directly.
- No blockers identified for the remaining plans in this phase.

---
*Phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel*
*Completed: 2026-10-19*

## Self-Check: PASSED

All 4 claimed files found on disk; both claimed commit hashes (`513e10b05`, `455432aa5`) found in git log.
