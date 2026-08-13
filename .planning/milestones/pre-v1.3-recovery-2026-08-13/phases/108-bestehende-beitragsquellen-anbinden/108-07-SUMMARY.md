---
phase: 108-bestehende-beitragsquellen-anbinden
plan: "07"
subsystem: backend-release-creation
tags: [go, pgx, release-crew, transactions, tdd]
requires:
  - phase: 108-03
    provides: ReleaseCrewService.SeedCreatedReleaseInTx transaction contract
provides:
  - Shared repository-side ReleaseCreationCrewSeeder injection seam
  - Creation-only import release crew seeding after canonical group ownership
  - Manual release crew seeding after canonical selected-group synchronization
affects: [108-08, episode-import, episode-version-create, member-points]
tech-stack:
  added: []
  patterns:
    - Optional variadic constructor injection preserving existing repository callers
    - Caller-owned transaction hook over canonical release_version_groups rows
key-files:
  created:
    - backend/internal/repository/episode_import_repository_release_helpers_test.go
    - backend/internal/repository/episode_version_repository_test.go
  modified:
    - backend/internal/repository/episode_import_repository.go
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - backend/internal/repository/episode_version_repository.go
key-decisions:
  - "Both creation boundaries share one narrow ReleaseCreationCrewSeeder interface; roster, snapshot, and point logic remain owned by ReleaseCrewService."
  - "The hook enumerates persisted release_version_groups inside the active transaction, making canonical group ownership a prerequisite rather than trusting request input."
  - "Import invokes the hook only when the release graph was newly created, so reprocessing an existing Jellyfin source cannot reseed it."
requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]
duration: 12 min
completed: 2026-07-24
---

# Phase 108 Plan 07: Release-Creation Crew Hooks Summary

Both canonical release creators now seed complete inherited crews and their point awards through the shared service contract, after persisted group ownership exists and inside the release transaction.

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-24T16:00:00Z
- **Completed:** 2026-07-24T16:12:00Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- Added one repository-safe `ReleaseCreationCrewSeeder` contract matching `ReleaseCrewService.SeedCreatedReleaseInTx`.
- Wired import upsert creation and `EpisodeVersionRepository.Create` after their canonical group-link writes.
- Made import reprocessing creation-only while retaining caller-owned atomic rollback for snapshot or award failures.
- Added RED-first contract tests for ordering, transaction placement, canonical group enumeration, and shared injection.

## Task Commits

1. **Task 1 RED: failing release creation crew hook tests** - `95212742`
2. **Task 1 GREEN: wire release crew creation hooks** - `55d285d0`

## Files Created/Modified

- `backend/internal/repository/episode_import_repository_release_helpers_test.go` - Import ordering and canonical-group hook contract tests.
- `backend/internal/repository/episode_version_repository_test.go` - Manual-create ordering, transaction, and shared-constructor contract tests.
- `backend/internal/repository/episode_import_repository.go` - Optional crew-seeder dependency.
- `backend/internal/repository/episode_import_repository_apply.go` - Passes the injected hook into release graph creation.
- `backend/internal/repository/episode_import_repository_release_helpers.go` - Shared hook contract and canonical group enumeration.
- `backend/internal/repository/episode_version_repository.go` - Optional hook injection and post-group-sync invocation.

## Decisions Made

- Repository code does not copy roster-selection, snapshot, or ledger behavior. The shared service remains the only implementation of latest-confirmed filtering, explicit empty inherited snapshots, normalized member-role awards, accountless beneficiaries, and exact-once point source identities.
- Canonical `release_version_groups` rows are queried before hook invocation. This also naturally handles multiple real member groups without using request-derived ownership.
- Existing constructors remain source-compatible through an optional variadic dependency; production binding is intentionally reserved for Plan 108-08.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Focused TDD RED run failed on all newly required hook contracts before implementation.
- `go test ./internal/repository -run 'EpisodeImport.*Crew|EpisodeVersionCreate.*Crew|ReleaseCreation.*(Award|Rollback|Retry|Latest|Accountless)|ReleaseCreationRepositories' -count=1` - PASS
- `go test ./internal/repository ./internal/services ./internal/handlers -count=1` - PASS
- `go test ./... -count=1` - PASS
- `git diff --check` - PASS
- TDD gate sequence: `95212742` RED precedes `55d285d0` GREEN - PASS

## Known Stubs

None.

## Next Plan Readiness

Ready for 108-08 to bind both optional repository seams to the single production `ReleaseCrewService` instance.

## Self-Check: PASSED

- All six key files exist.
- RED commit `95212742` and GREEN commit `55d285d0` exist.
- Focused, relevant package, and complete backend suites pass.
