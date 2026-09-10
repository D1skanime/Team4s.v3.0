---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
plan: 01
subsystem: api
tags: [go, postgresql, pgx, repository, query-budget, badges]

# Dependency graph
requires:
  - phase: 132-member-profile-frontend-performance
    provides: phase131ConstantQueryBudget regression-guard test scaffold (queryCounter, openPhase131Postgres, seedPhase131MemberWithCurrentProjects)
provides:
  - GetPublicMemberProfileByID hoists loadRoleVolumeCounts/loadContribProjectsCount/loadContribChronicleCount/loadContribArchivistCount to run exactly once per request
  - loadRoleVolumeBadges and loadContributionBadges as pure derivation functions (no ctx, no error return) taking pre-loaded counts
  - loadBadgeProgress accepting pre-loaded roleVolumeCounts/projectsCount/chronicleCount/archivistCount instead of re-querying them
  - phase131ConstantQueryBudget lowered 20 -> 16 with empirical before/after proof against the same fixture database
affects: [154-02, 154-03, 154-04, 154-05, 154-06, 154-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hoist-once-pass-down: expensive raw-count loaders called exactly once by the orchestrating aggregator function, then passed as parameters into every consumer that previously re-queried them independently"

key-files:
  created: []
  modified:
    - backend/internal/repository/member_profile_public_repository.go
    - backend/internal/repository/member_profile_role_volume_repository.go
    - backend/internal/repository/member_profile_contribution_badges_repository.go
    - backend/internal/repository/member_profile_progress_repository.go
    - backend/internal/repository/member_profile_role_volume_repository_test.go
    - backend/internal/repository/member_profile_contribution_badges_repository_test.go
    - backend/internal/repository/member_profile_progress_repository_test.go
    - backend/internal/repository/member_profile_repository_postgres_test.go
    - backend/internal/repository/member_profile_query_budget_test.go

key-decisions:
  - "loadRoleVolumeBadges/loadContributionBadges became pure derivation functions (no context.Context, no error) since they no longer perform I/O; loadBadgeProgress keeps its (ctx, error) shape because its two genuinely-unique QueryRow blocks (projectCount, membershipYears) still perform I/O"
  - "GetOwnDashboard's independent calls to the four raw-count loaders were left completely untouched -- only the three consumer signatures changed, never the raw-count loaders themselves"
  - "member_profile_repository_postgres_test.go (not in the plan's declared file_modified list) required the same signature-migration fix under Rule 3 (blocking compile issue) -- it independently called the old loadRoleVolumeBadges(ctx, memberID) signature in 7 places"

patterns-established:
  - "Hoist-once-pass-down for duplicate raw-fact loaders inside a sequential aggregator: measure the actual duplicate call count via the existing queryCounter test-support tracer, don't assume it from the plan's interface notes alone"

requirements-completed: [P154-01, P154-02, P154-03, P154-04]

# Metrics
duration: 7min (task work; excludes pre-execution context reading)
completed: 2026-09-10
---

# Phase 154 Plan 01: Aggregator-Duplikate entfernen Summary

**GetPublicMemberProfileByID hoists four raw-count loaders (role-volume, contribution-projects, chronicle, archivist) to run exactly once per request instead of twice, cutting the enforced query-budget regression guard from 20 to 16 -- empirically re-measured against the same live PostgreSQL fixture with both the pre-change and post-change code.**

## Performance

- **Duration:** ~7 min of task execution (Task 1 14:35, Task 3 14:42)
- **Started:** 2026-09-10T14:35:47Z (Task 1 commit)
- **Completed:** 2026-09-10T14:42:32Z (Task 3 commit)
- **Tasks:** 3/3 completed
- **Files modified:** 9

## Accomplishments
- `GetPublicMemberProfileByID` now calls `loadRoleVolumeCounts`, `loadContribProjectsCount`, `loadContribChronicleCount`, and `loadContribArchivistCount` exactly once per request, passing the results into the three consumers (`loadRoleVolumeBadges`, `loadContributionBadges`, `loadBadgeProgress`) that previously each re-queried the same four facts independently
- Empirically measured, not just asserted: a schema-only fixture database (`team4s_phase131_test`, restored via `pg_dump --schema-only` of `team4s_v2`) proved **before = 20 queries, after = 16 queries** for both a 2-project and a 6-project seeded member, run against a `git archive` checkout of the pre-Task-1 commit and the current code respectively
- `GetOwnDashboard` (`member_profile_dashboard_repository.go`) is byte-for-byte untouched (`git diff --stat` empty) and its own Postgres-backed tests (`TestGetOwnDashboardPostgresRoleVolumeRawEntriesVersusBadgesCount`, `TestGetOwnDashboardPostgresRoleVolumeEntryCarriesRegistryTierAndThreshold`) pass unchanged
- No assertion literal changed in any updated test file -- only call-site shapes (verified via `git diff` grep for `require.Equal`/`require.True` lines)

## Task Commits

Each task was committed atomically:

1. **Task 1: Hoist the four raw-count loads to run once; change the three consumer signatures** - `f1f2d293` (fix)
2. **Task 2: Update existing unit tests to the new consumer signatures** - `9e80aad8` (test)
3. **Task 3: Update the query-budget regression guard and run the full backend gate** - `857cdf13` (fix)

_No TDD tasks in this plan (type="auto" throughout, tdd not set)._

## Files Created/Modified
- `backend/internal/repository/member_profile_public_repository.go` - `GetPublicMemberProfileByID` hoists the four raw-count loader calls once, passes results into the three consumers
- `backend/internal/repository/member_profile_role_volume_repository.go` - `loadRoleVolumeBadges(counts []RoleVolumeCount) []models.PublicMemberBadge` (pure derivation, no ctx/error)
- `backend/internal/repository/member_profile_contribution_badges_repository.go` - `loadContributionBadges(projectsCount, chronicleCount, archivistCount int64) []models.PublicMemberBadge` (pure derivation, no ctx/error)
- `backend/internal/repository/member_profile_progress_repository.go` - `loadBadgeProgress` gains four new parameters (`roleVolumeCounts`, `projectsCount`, `chronicleCount`, `archivistCount`); the two genuinely-unique `QueryRow` blocks (`projectCount`, `membershipYears`) are untouched
- `backend/internal/repository/member_profile_role_volume_repository_test.go` - 5 call sites updated to compute `counts` via `loadRoleVolumeCounts` then call `loadRoleVolumeBadges(counts)`
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go` - 10 call sites updated to compute the three raw counts then call `loadContributionBadges(projectsCount, chronicleCount, archivistCount)`
- `backend/internal/repository/member_profile_progress_repository_test.go` - 3 call sites updated to compute all four raw-count parameters then call the extended `loadBadgeProgress` signature
- `backend/internal/repository/member_profile_repository_postgres_test.go` - 7 call sites updated (Rule 3 fix, file not in plan's declared list, needed for `go vet ./...` to pass)
- `backend/internal/repository/member_profile_query_budget_test.go` - `phase131ConstantQueryBudget` lowered from `20` to `16`, comment explicitly labels it a regression guard, not a performance benchmark

## Decisions Made
- `loadRoleVolumeBadges`/`loadContributionBadges` dropped `context.Context` and their error return entirely, since they became pure in-memory derivation functions with no I/O left. `loadBadgeProgress` kept its `(ctx, error)` signature because it still performs two genuinely-unique `QueryRow` calls.
- The raw-count loaders themselves (`loadRoleVolumeCounts`, `loadContribProjectsCount`, `loadContribChronicleCount`, `loadContribArchivistCount`) were left completely unchanged, per the plan's explicit T-154-A-02 threat mitigation -- `GetOwnDashboard`'s independent call sites in `member_profile_dashboard_repository.go` continue to compile and pass without modification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed a second test file's calls to the old `loadRoleVolumeBadges` signature**
- **Found during:** Task 2 (`go vet ./...` after updating the plan's declared three test files)
- **Issue:** `member_profile_repository_postgres_test.go` (not listed in the plan's `files_modified` frontmatter) independently called `repo.loadRoleVolumeBadges(context.Background(), 1)` in 7 places, which failed to compile against Task 1's new `loadRoleVolumeBadges(counts []RoleVolumeCount) []models.PublicMemberBadge` signature.
- **Fix:** Updated all 7 call sites to compute `counts` via `loadRoleVolumeCounts` first, then call `loadRoleVolumeBadges(counts)` without an error check, matching the pattern used in the plan's declared test files.
- **Files modified:** `backend/internal/repository/member_profile_repository_postgres_test.go`
- **Verification:** `go vet ./...` exits 0; all 7 affected tests (`TestLoadPublicBadgesPostgres*`, `TestLoadPublicBadgesPostgresRoleVolume`) pass against `TEAM4S_PHASE128_TEST_DSN`.
- **Committed in:** `9e80aad8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for the package to compile at all; no scope creep beyond mechanically applying Task 1's signature change to a fourth call site the plan's file inventory missed.

## Issues Encountered

- `TEAM4S_PHASE131_TEST_DSN`'s target database (`team4s_phase131_test`) did not exist on `team4s-linux` before this plan ran (only `team4s_phase128_test`/`team4s_phase129_test` did). Created it via `CREATE DATABASE team4s_phase131_test OWNER team4s;` followed by `pg_dump --schema-only team4s_v2 | psql team4s_phase131_test` (per the test file's own header-comment instructions). No production data was touched; the source `team4s_v2` was only read (`pg_dump --schema-only`).
- Several `internal/repository` and `internal/migrations` tests fail regardless of this plan's changes because they depend on infrastructure this plan does not provision: a live HTTP server at `192.168.235.196:18093` and valid Keycloak credentials for `sheppert@team4s.local` (the `TestPhase134Matrix*` tests), plus a handful of unrelated RED source-inspection guard tests (`TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`, `TestClaimBlockDeniedAuditOutcomeColocated`, `TestEvaluateMemberMutationConflictBlocksLastActiveManager`, `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`) and two `internal/migrations` tests needing dedicated DSNs not supplied here (`TestPhase134MigrationFreshUpDownProof`, `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible`). Per this phase's discipline rule (no "pre-existing" claim without evidence), these were NOT waved off on assumption -- each was independently reproduced against a `git archive` checkout of the pre-Task-1 commit (`286b7fe2`) with an identical failure-name set (byte-for-byte diff match except timing values), proving they are unrelated to this plan's diff.

## Verification Evidence (real numbers, not assumed)

- `go build ./...` and `go vet ./...`: both exit 0.
- `TestPhase131PublicProfileQueryBudgetIsConstant` (against `team4s_phase131_test`, current code): `2 projects -> 16 queries; 6 projects -> 16 queries` (PASS, `phase131ConstantQueryBudget = 16`).
- Same test against the pre-Task-1 code (`git archive` of commit `286b7fe2`, same fixture database): `2 projects -> 20 queries; 6 projects -> 20 queries` (PASS against the old `phase131ConstantQueryBudget = 20`).
- **Net reduction: 20 -> 16 queries per public-profile load, confirmed constant regardless of project count in both states.**
- `go test ./internal/repository/... -count=1`: 419 PASS, 154 SKIP (DSN-gated tests whose dedicated env var was not supplied to this particular run, e.g. `TEAM4S_PHASE106_TEST_DSN`/`TEAM4S_PHASE134_TEST_DSN`), 14 FAIL. All 14 FAILs independently reproduced with an identical failure-name set against the pre-Task-1 baseline checkout (see Issues Encountered).
- `go test ./... -count=1`: `cmd/server`, `internal/auth`, `internal/badges`, `internal/config`, `internal/handlers`, `internal/middleware`, `internal/models`, `internal/observability`, `internal/permissions`, `internal/services`, `internal/testquality`, `internal/testsupport` all `ok`. Only `internal/migrations` (2 pre-existing FAILs, reproduced identically on baseline) and `internal/repository` (14 pre-existing FAILs, reproduced identically on baseline) show failures.

## User Setup Required

None - no external service configuration required. (The `team4s_phase131_test` fixture database was created directly on `team4s-linux`'s existing PostgreSQL container as part of this plan's own test execution.)

## Next Phase Readiness

- The four-duplicate-query removal (RCA-05/P154-01..04) is complete and locked by a regression-guard test at the new constant of 16.
- `GetOwnDashboard` remains fully independent and unaffected, ready for any later plan touching it.
- Plans 154-02 through 154-07 (RCA-06/RCA-08 and the retest items) are unaffected by this plan's scope and can proceed independently.

---
*Phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung*
*Completed: 2026-09-10*
