---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 02
subsystem: api
tags: [go, gin, pgx, postgres, release-versions, fansub-groups, dependents-guard, tdd]

# Dependency graph
requires:
  - phase: 187-01
    provides: "DependencySummary, countReleaseVersionGroupDependents, queryCurrentReleaseVersionGroupIDs, diffRemovedReleaseVersionGroupIDs, ensureReleaseVersionGroupsNotReducedToEmpty, ensureRemovedReleaseVersionGroupsHaveNoDependents, ErrGroupHasDependents/ErrReleaseVersionGroupsEmpty/GroupHasDependentsError, testsupport.OpenPhase187Postgres"
provides:
  - "episode_version_repository_group_sync.go: resolveMemberGroupsForSync/upsertReleaseVersionGroupsForSync/syncEpisodeVersionSelectedGroups extracted out of the over-450-line write_helpers.go, now guard-wired"
  - "syncEpisodeVersionSelectedGroups calls the Plan-01 guard before any DELETE/INSERT: empty-reduction rejection (D-06/D-14) and dependents-having-removal rejection (D-01/D-07/D-08/D-09), both before any write"
  - "episode_version_update.go PATCH handler: errors.Is(err, repository.ErrGroupHasDependents) -> 409 with a German per-kind (Credits/Medien/Notizen) breakdown + code=release_version_group_has_dependents; errors.Is(err, repository.ErrReleaseVersionGroupsEmpty) -> 400"
  - "Both new handler branches apply before the generic 500 fallback and regardless of actor.IsPlatformAdmin (D-11), proven by a dedicated platform-admin-identity test"
affects: [187-03, 187-04, 187-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-check-before-write guard applied inside the EXISTING editor write path (not a new endpoint): queryCurrentReleaseVersionGroupIDs -> ensureReleaseVersionGroupsNotReducedToEmpty -> diffRemovedReleaseVersionGroupIDs -> ensureRemovedReleaseVersionGroupsHaveNoDependents, strictly before upsertReleaseVersionGroupsForSync runs"
    - "Handler-layer error-sentinel-to-HTTP-status mapping extends the existing errors.Is chain (ErrNotFound/ErrConflict precedent) rather than introducing a new error-handling shape"

key-files:
  created:
    - backend/internal/repository/episode_version_repository_group_sync.go
    - backend/internal/repository/episode_version_repository_group_sync_test.go
    - backend/internal/handlers/episode_version_update_test.go
  modified:
    - backend/internal/repository/episode_version_repository_write_helpers.go
    - backend/internal/repository/episode_version_repository_write_helpers_test.go
    - backend/internal/handlers/episode_version_update.go

key-decisions:
  - "The deleted source-grep test TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRows was replaced with a real-Postgres idempotency test rather than relocated verbatim -- its file-path-coupled strings.Index assertions would have silently asserted a permanent false after the split regardless of logic correctness, and CLAUDE.md's Teststil rule forbids extending that pattern"
  - "The handler-layer test fixture (openEVUFixture) builds directly on testsupport.OpenPhase187Postgres rather than bridging it with testsupport.OpenPhase117Postgres: the two fixtures define incompatible schemas for several shared table names (fansub_groups, release_version_groups), and Phase187's guard tables (migration 0137) have FK dependencies (point_ledger_entries, anime_fansub_groups) Phase117 does not provide -- extending Phase187 in place with exactly the episode/release/variant chain UpdateEpisodeVersion needs was simpler and mirrors the project's established 'extend the shared base fixture in place' convention (openEVECFixture)"

patterns-established:
  - "syncEpisodeVersionSelectedGroups is now the single call site both this plan's editor path and Plan 03's import path extend identically -- no call-site-specific guard-bypass branching exists"

requirements-completed: [D-01, D-02, D-06, D-07, D-08, D-09, D-10, D-11, D-14]

# Metrics
duration: ~17min
completed: 2026-10-19
---

# Phase 187 Plan 02: Gruppenwechsel-Editor-Guard-Verdrahtung Summary

**Editor PATCH path now returns a German 409 ("X Credits, Y Medien, Z Notizen hängen noch daran") for a group removal with real dependents and a 400 for an empty-groups reduction, both enforced before any DELETE/INSERT and regardless of platform-admin status -- replacing the former silent CASCADE/blanket-DELETE/generic-500 behavior.**

## Performance

- **Duration:** ~17 min (commit span 11:23:37Z-11:38Z)
- **Started:** 2026-10-19T11:23:37Z
- **Completed:** 2026-10-19T11:38:28Z
- **Tasks:** 3/3 completed
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- Split the three group-sync functions (`resolveMemberGroupsForSync`, `upsertReleaseVersionGroupsForSync`, `syncEpisodeVersionSelectedGroups`) out of the over-450-line `episode_version_repository_write_helpers.go` (459 -> 377 lines) into a new `episode_version_repository_group_sync.go`, as a pure byte-identical move with zero behavior change.
- Replaced the move-breaking, CLAUDE.md-forbidden source-grep test `TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRows` with a real-Postgres behavior test (`TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRowsIdempotently`) proving the same N-junction-row-write + `ON CONFLICT ... DO NOTHING` idempotency guarantee.
- Wired the Plan-01 guard into `syncEpisodeVersionSelectedGroups`: `queryCurrentReleaseVersionGroupIDs` -> `ensureReleaseVersionGroupsNotReducedToEmpty` -> `diffRemovedReleaseVersionGroupIDs` -> `ensureRemovedReleaseVersionGroupsHaveNoDependents`, all strictly before `upsertReleaseVersionGroupsForSync` runs. The old unconditional blanket-DELETE-on-empty-selection branch is gone.
- Proved the full behavior table against a real Postgres fixture (`TestSyncEpisodeVersionSelectedGroups_GuardBehavior`): empty-reduction rejected with zero mutation, already-empty stays a no-op, dependents-having removal rejected with the removed group's row surviving, dependents-free removal still succeeds (D-01 regression).
- Extended the PATCH handler's existing `errors.Is` chain with two new branches: `ErrGroupHasDependents` -> HTTP 409 with a German per-kind breakdown and `code=release_version_group_has_dependents`; `ErrReleaseVersionGroupsEmpty` -> HTTP 400. Proved both at the HTTP layer, including a dedicated test with a platform-admin identity showing the 409 still fires (D-11 -- the guard is a data-consistency rule, not an authorization check).
- Full backend suite re-run after the fix below: `scripts/test-backend.sh` -> `GATE: GREEN (0)`, 24 throwaway databases created/dropped, all new tests passing alongside the existing suite with zero regressions.

## Task Commits

Each task was committed atomically (Tasks 2 and 3 followed the TDD RED/GREEN gate as separate commits):

1. **Task 1: Pure split of episode_version_repository_write_helpers.go + replace broken source-grep test** - `acc4c5d4b` (refactor)
2. **Task 2, RED: behavior-table test for the group-sync guard** - `a4db6e18a` (test)
3. **Task 2, GREEN: wire the guard into the editor group-sync path** - `2db220a5c` (feat)
4. **Task 3, RED: handler-layer 409/400 test** - `b7242caa2` (test)
5. **Task 3, GREEN: handler 409/400 branches** - `b7408c4b1` (feat)

**Plan metadata:** (this commit) `docs(187-02): complete plan`

## Files Created/Modified
- `backend/internal/repository/episode_version_repository_group_sync.go` - `resolveMemberGroupsForSync`, `upsertReleaseVersionGroupsForSync`, `syncEpisodeVersionSelectedGroups` (guard-wired)
- `backend/internal/repository/episode_version_repository_group_sync_test.go` - idempotent-write successor test + `TestSyncEpisodeVersionSelectedGroups_GuardBehavior` (4-case behavior table)
- `backend/internal/repository/episode_version_repository_write_helpers.go` - the 3 group-sync functions removed (459 -> 377 lines)
- `backend/internal/repository/episode_version_repository_write_helpers_test.go` - deleted the file-path-coupled source-grep test the move broke
- `backend/internal/handlers/episode_version_update.go` - two new `errors.Is` branches (409/400) before the generic 500 fallback
- `backend/internal/handlers/episode_version_update_test.go` - `TestUpdateEpisodeVersion_GroupGuard` (409/200/400 against a real HTTP handler call), `openEVUFixture` extending the shared Phase-187 fixture with the episode/release/variant chain `UpdateEpisodeVersion` needs

## Decisions Made
- Deleted (did not relocate) the broken source-grep test; replaced it with a real-behavior Postgres test proving the identical guarantee, per CLAUDE.md's Teststil rule.
- Built the handler-layer test fixture directly on `testsupport.OpenPhase187Postgres` rather than trying to bridge it with `testsupport.OpenPhase117Postgres` (incompatible/duplicate table definitions, missing FK targets for migration 0137) -- extended it in place instead, mirroring the established `openEVECFixture` convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended the Phase-187 fixture's minimal fansub_groups/anime_fansub_groups stand-ins with columns the group-sync guard's own code path reads**
- **Found during:** Task 2 (first RED run of `TestSyncEpisodeVersionSelectedGroups_GuardBehavior`)
- **Issue:** `resolveMemberGroupsForSync`'s ID-lookup path (`lookupImportFansubGroupByID`) selects `slug`/`name` from `fansub_groups`, and `ensureAnimeFansubGroupLinksForMembers` inserts `is_primary`/`notes` into `anime_fansub_groups` -- neither column exists on the Phase-187 fixture's deliberately minimal (id-only) stand-ins, since no test up to this plan needed to resolve a fansub group by ID through that code path.
- **Fix:** Extended the test-local pool with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for exactly those columns, mirroring `openEVECFixture`'s established "extend the shared base fixture in place" precedent. No shared `testsupport/*.go` file was touched -- the extension lives in the test file that needs it.
- **Files modified:** `backend/internal/repository/episode_version_repository_group_sync_test.go`
- **Verification:** Scoped `go test ./internal/repository/... -run TestSyncEpisodeVersionSelectedGroups` passed; confirmed again in the full `scripts/test-backend.sh` run.
- **Committed in:** `a4db6e18a` (Task 2 RED test commit)

**2. [Rule 3 - Blocking] Extended the Phase-187 fixture with the episode/release/variant chain and zero-row support tables UpdateEpisodeVersion's Update/GetByID calls read**
- **Found during:** Task 3 (first RED run of `TestUpdateEpisodeVersion_GroupGuard`)
- **Issue:** The Phase-187 fixture has no `episodes`/`fansub_releases`/`release_variants`/`release_streams`/`stream_sources`/`release_variant_episodes`/`theme_segments`/`theme_segment_assignments` tables and `release_versions` lacks `release_id`/`title`/`production_started_on`/`release_date` -- `loadEpisodeVersionStateForUpdate` and `GetByID`'s SELECTs reference all of these even when the patch only touches `fansub_groups`.
- **Fix:** `openEVUFixture` creates/ALTERs exactly those tables/columns (zero rows needed for most of them -- they only need to exist for the SELECT's LEFT JOINs to resolve), mirroring `episode_version_stream_identity_test.go`'s INSERT shape for the parent-row chain.
- **Files modified:** `backend/internal/handlers/episode_version_update_test.go`
- **Verification:** Scoped `go test ./internal/handlers/... -run TestUpdateEpisodeVersion` passed; confirmed again in the full `scripts/test-backend.sh` run alongside the pre-existing `TestEpisodeVersionSourceHydration*`/`TestReleaseMetadataOnlyRejectsSourceSelector` tests in the same package (no regression).
- **Committed in:** `b7242caa2` (Task 3 RED test commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - test-fixture-only blocking issues, no production code behavior affected)
**Impact on plan:** Both fixes are test-infrastructure-only (new test files extending a shared fixture in place, following an established codebase convention). No scope creep, no product behavior change.

## TDD Gate Compliance

Tasks 2 and 3 were marked `tdd="true"`. Both followed the full RED/GREEN cycle as separate commits:
- Task 2: RED `a4db6e18a` (behavior-table test, confirmed failing against the pre-guard implementation for the two guard-rejection cases) -> GREEN `2db220a5c` (guard wired in, all 4 cases pass).
- Task 3: RED `b7242caa2` (handler test, confirmed 500 instead of 409/400 against the pre-branch handler) -> GREEN `b7408c4b1` (409/400 branches added, all 3 cases pass).

No REFACTOR commit was needed for either task (no cleanup beyond the GREEN change itself).

## Issues Encountered
None beyond the two auto-fixed test-fixture gaps documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 03 (import write path) can call the exact same `syncEpisodeVersionSelectedGroups` guard surface this plan wired up -- no call-site-specific exception logic needed, per Plan 01's Architecture Decisions.
- Plan 04 (handler/UI dependents display) can reuse this plan's `GroupHasDependentsError`-to-German-message mapping pattern if it needs the same breakdown text elsewhere.
- No blockers identified for the remaining plans in this phase.

---
*Phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel*
*Completed: 2026-10-19*

## Self-Check: PASSED

All 7 claimed files found on disk; all 5 claimed task commit hashes (`acc4c5d4b`, `a4db6e18a`, `2db220a5c`, `b7242caa2`, `b7408c4b1`) found in git log.
