---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 03
subsystem: api
tags: [go, pgx, postgresql, transactions, episode-import, theme-segments]

# Dependency graph
requires:
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: 02
    provides: "AssignThemeSegmentToEpisodeRange as the canonical Soll-Ist reconciliation with the byte-identical episode/version join pattern this plan's reverse-direction hook reuses"
provides:
  - "upsertReleaseVersionGroup auto-assign hook: a newly created release version inside an existing segment's episode range is automatically present in theme_segment_assignments, no admin action, no separate call to AssignThemeSegmentToEpisodeRange"
  - "resolveReleaseVersionEpisodeSortIndexAndVersion / autoAssignThemeSegmentsForNewReleaseVersion (episode_import_repository_release_autoassign.go) -- one bundled INSERT...SELECT per attached fansub group, resolved once per release version, never per segment"
affects: [156-04, 156-05, 156-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reverse-direction auto-assign hooked into the existing per-group loop of a production insert path, instead of a new post-commit reconciliation pass"
    - "Once-per-release-version resolution of episode sort-index + normalized version, reused across N attached groups in the same transaction (no N+1 across groups)"

key-files:
  created:
    - backend/internal/repository/episode_import_repository_release_autoassign.go
    - backend/internal/repository/episode_import_repository_autoassign_test.go
  modified:
    - backend/internal/repository/episode_import_repository_release_helpers.go

key-decisions:
  - "Split the new auto-assign query/helper functions into a dedicated sibling file (episode_import_repository_release_autoassign.go) rather than growing episode_import_repository_release_helpers.go past its pre-existing 421 lines -- keeps both files comfortably under CLAUDE.md's 450-line cap (432 and 75 lines respectively) with headroom for future workstreams in this same file family"
  - "Episode sort-index and normalized version are resolved ONCE per release version (before the per-group loop), not once per group, since neither value varies by fansub group -- the per-group loop only runs the bundled INSERT...SELECT itself"
  - "When the episode's position cannot be resolved (no sort_index, non-numeric episode_number), the auto-assign is skipped entirely (nil episodeSortIndex short-circuits to a no-op) rather than guessing a fallback value -- mirrors the existing enumeration query's own NULL-on-unresolvable-position behavior"

requirements-completed: [P156-04]

# Metrics
duration: 14min
completed: 2026-09-11
---

# Phase 156 Plan 03: Auto-Assignment of Newly Created Release Versions Summary

**A release version created after a matching theme segment already exists now gets auto-assigned via one bundled `INSERT...SELECT` per attached fansub group inside `upsertReleaseVersionGroup`, closing the release-first ordering gap that `AssignThemeSegmentToEpisodeRange` (Plan 156-02) does not cover.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-11T20:46:00Z
- **Completed:** 2026-09-11T21:00:00Z
- **Tasks:** 1 completed
- **Files modified:** 3 (1 modified, 2 new)

## Accomplishments
- `upsertReleaseVersionGroup` (the only production insert path for `release_versions`, confirmed via the existing `episode_import_repository_release_helpers.go`) now resolves the new release version's episode sort-index and normalized version once, then runs a bundled, per-group `INSERT INTO theme_segment_assignments ... SELECT ... FROM theme_segments ... ON CONFLICT DO NOTHING` immediately after each group's `release_version_groups` row is written
- The episode/version resolution fragments (`COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END)` and `COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1')`) are byte-identical (diff-confirmed) to `theme_segment_assignments.go`'s `themeSegmentRangeTargetQuery`, so segment-first and release-first orderings converge on the same target set
- Four new integration tests against real PostgreSQL (`TEAM4S_PHASE117_TEST_DSN`) prove: segment-first auto-assign works without calling `AssignThemeSegmentToEpisodeRange`; replaying the hook for an already-assigned release version does not duplicate the row (`ON CONFLICT DO NOTHING` proven, not assumed); a release version resolving to two fansub groups gets auto-assigned once per group via two independent bundled queries; and a release version outside every segment's range gets zero new assignment rows
- `episode_import_repository_release_helpers.go` grew by only 12 lines (432 total) by delegating the new query/resolution logic to a dedicated sibling file (`episode_import_repository_release_autoassign.go`, 75 lines) -- both files stay well under CLAUDE.md's 450-line cap

## Task Commits

Each task was committed atomically:

1. **Task 1: Bundled auto-assign hook on new release-version creation + integration tests** - `97f1b43c` (feat)

**Plan metadata:** (this commit) `docs(156-03): complete plan`

## Files Created/Modified
- `backend/internal/repository/episode_import_repository_release_helpers.go` - `upsertReleaseVersionGroup` now resolves `episodeSortIndex`/`normalizedVersion` once via `resolveReleaseVersionEpisodeSortIndexAndVersion`, then calls `autoAssignThemeSegmentsForNewReleaseVersion` once per group inside the existing per-group loop, right after the `release_version_groups` upsert
- `backend/internal/repository/episode_import_repository_release_autoassign.go` - NEW: `autoAssignThemeSegmentsForNewReleaseVersionQuery` (the bundled `INSERT...SELECT`), `resolveReleaseVersionEpisodeSortIndexAndVersion` (byte-identical join to the segment-side enumeration query), `autoAssignThemeSegmentsForNewReleaseVersion` (per-group entry point, no-op when the episode's position cannot be resolved)
- `backend/internal/repository/episode_import_repository_autoassign_test.go` - NEW: `TestUpsertReleaseVersionGroupAutoAssign_SegmentFirst`, `TestUpsertReleaseVersionGroupAutoAssign_ReleaseFirstThenSegment`, `TestUpsertReleaseVersionGroupAutoAssign_MultiGroup`, `TestUpsertReleaseVersionGroupAutoAssign_OutOfRangeGetsNoAssignment`, plus shared fixture helpers (`seedAutoAssignBaseFixture`, `seedAutoAssignFansubGroup`, `seedAutoAssignThemeSegment`, `createAutoAssignReleaseVersion`, `callUpsertReleaseVersionGroup`, `assignedReleaseVersionIDsForSegment`)

## Decisions Made
- Called `upsertReleaseVersionGroup` directly in the new tests (per the plan's explicit fallback option) rather than the full `upsertImportReleaseGraph`/`applyReleaseNative` pipeline, since the latter requires Jellyfin media-candidate/stream-source scaffolding unrelated to what this hook needs to prove. `createAutoAssignReleaseVersion` mirrors the production `createFansubRelease`/`createReleaseVersion` insert shape (explicit IDs, since the Phase-117 fixture's `fansub_releases`/`release_versions` stub tables have no serial default) so the hook is still exercised against a release version created the same way production creates one.
- Extended the Phase-117 test fixture locally (inside the new test file, not `testsupport/phase117_postgres.go`) with an `anime_fansub_groups` stub table and `slug`/`status` columns on the fixture's `fansub_groups` stub -- both are needed by `upsertReleaseVersionGroup`'s existing tail calls (`ensureAnimeFansubGroupLinksForMembers`, `lookupImportFansubGroupByID`) but were never previously exercised by any test using this shared fixture, since no prior test called `upsertReleaseVersionGroup` directly. This is a Rule 3 (blocking issue) fix scoped to the new test file only, not a change to the shared fixture file itself.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phase-117 fixture missing `anime_fansub_groups` table and `fansub_groups.slug`/`status` columns**
- **Found during:** Task 1, writing the first integration test
- **Issue:** `upsertReleaseVersionGroup`'s existing tail call `ensureAnimeFansubGroupLinksForMembers` inserts into `anime_fansub_groups`, and `resolveImportFansubSelection`'s `FansubGroups`-by-ID path (`lookupImportFansubGroupByID`) selects `id, slug, name` -- neither the table nor the columns exist in the shared `testsupport.OpenPhase117Postgres` stub schema, because no prior test in this table family called `upsertReleaseVersionGroup` directly (all prior tests only exercised `theme_segment_assignments.go`'s functions).
- **Fix:** The new test file creates `anime_fansub_groups` (mirroring migration `0011_anime_fansub_groups.up.sql`'s shape) and adds `slug`/`status` columns to the fixture's `fansub_groups` stub via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, scoped locally inside `seedAutoAssignBaseFixture` (per-test isolated schema, no cross-test/cross-file impact).
- **Files modified:** `backend/internal/repository/episode_import_repository_autoassign_test.go` only.
- **Commit:** `97f1b43c`

**2. [Rule 1 - Bug] Two Postgres parameter-type errors during test authoring, fixed before commit**
- **Found during:** Task 1, first test run against real Postgres
- **Issue:** (a) An episode-seeding INSERT reused the same bind parameter (`$3`) both as an implicit integer and an explicit `::text` cast, which Postgres rejects with "inconsistent types deduced for parameter" (SQLSTATE 42P08); (b) the DSN's target database name (`team4s_phase117_test`) did not match the fixture's required suffixed pattern -- the actual live fixture database from Plan 156-02 (`team4s_phase117_test_156`) was used instead.
- **Fix:** Split the reused parameter into two separate bind parameters; used the correct existing fixture database name.
- **Files modified:** `backend/internal/repository/episode_import_repository_autoassign_test.go` only (test-authoring fixes, no production code affected).
- **Commit:** `97f1b43c`

---

**Total deviations:** 2 auto-fixed (1 blocking test-fixture gap, 1 test-authoring bug) -- both scoped entirely to the new test file, zero impact on production code or the shared `testsupport` package.

## Known Pre-Existing Debt (not introduced by this plan)

Running the full `internal/repository` package suite (not scoped to this plan's tests) shows pre-existing failures unrelated to this plan: several `TestPhase128*` tests require `TEAM4S_PHASE128_TEST_DSN` (not set in this environment) and several `TestPhase134Matrix*` tests require a live HTTP/Keycloak endpoint reachable at `192.168.235.196:18093` (not reachable from the bare `docker run` container used for this plan's verification, which is not attached to the full Docker Compose network the same way the live backend container is). Both are pre-existing, environment-dependent test categories documented in prior phases' SUMMARY files (154, 155, 156-01, 156-02) as requiring the live dev stack, not caused by this plan's changes. This plan's own tests, plus the full existing `episode_import_repository_*` and `theme_segment_assignments*` test files, all pass cleanly (confirmed via a scoped `-run` filter covering all of them).

## Issues Encountered

None beyond the two auto-fixed test-authoring issues documented above.

## User Setup Required

None - no external service configuration required. The `team4s_phase117_test_156` fixture database (already created during Plan 156-02's execution) was reused directly against the live `team4sv30-db` dev container for this plan's verification.

## Next Phase Readiness
- Workstream B (P156-04) is now closed: both orderings (segment-first via Plan 156-02's `AssignThemeSegmentToEpisodeRange`, release-first via this plan's hook) converge on the same `theme_segment_assignments` target set, using the identical episode/version resolution fragments.
- Plans 156-05/156-07 (segment-origin storage, dynamic segment-credit projection) can proceed independently; this plan does not touch `theme_segments.origin_release_version_id` or any credit-projection code.
- No blockers identified for downstream plans.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*

## Self-Check: PASSED

All created/modified files confirmed present on disk (3/3 checked: `episode_import_repository_release_autoassign.go`,
`episode_import_repository_autoassign_test.go`, `episode_import_repository_release_helpers.go`). Commit `97f1b43c`
confirmed present in `git log`. `wc -l` confirms both touched/created repository files (432 and 75 lines) stay
under CLAUDE.md's 450-line production-file cap. All 4 new integration tests plus the full pre-existing
`episode_import_repository_*`/`theme_segment_assignments*` test suites pass against real PostgreSQL
(`TEAM4S_PHASE117_TEST_DSN=team4s_phase117_test_156`).
