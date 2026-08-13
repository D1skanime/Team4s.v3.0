---
phase: 108-bestehende-beitragsquellen-anbinden
plan: "02"
subsystem: database
tags: [postgresql, pgx, release-crew, snapshots, tdd]

requires:
  - phase: 108-01
    provides: Canonical release crew snapshot context and inherited/independent modes
provides:
  - Confirmed-only complete release crew snapshot storage
  - Inherited snapshot synchronization with permanent independent isolation
  - Stored-snapshot-only effective contribution reads
affects: [108-03, 108-04, 108-06, release-crew-service, contribution-drawer]

tech-stack:
  added: []
  patterns:
    - Caller-owned DBTX snapshot mutation under a release/group advisory lock
    - Empty independent snapshots represented by the snapshot context row

key-files:
  created:
    - backend/internal/repository/release_crew_snapshot_repository.go
    - backend/internal/repository/release_crew_snapshot_repository_test.go
    - backend/internal/repository/admin_content_fansub_releases_contributions_repository_test.go
  modified:
    - backend/internal/repository/admin_content_fansub_releases_contributions_repository.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go

key-decisions:
  - "Effective release crew reads require a stored snapshot context and never synthesize project defaults."
  - "Project synchronization rechecks inherited mode under the release/group lock before replacement."

patterns-established:
  - "Confirmed-only replacement deletes and recreates only confirmed release rows, preserving every open or historical review row."
  - "Complete-set normalization deduplicates and sorts member-role units without merging unrelated roles."

requirements-completed: [GAM-01, GAM-02, GAM-05]

duration: 10 min
completed: 2026-07-24
---

# Phase 108 Plan 02: Stored Release Crew Snapshot Summary

**Complete confirmed-only release crews now persist per release/group context, synchronize only while inherited, and power the existing GET path without project fallback**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-24T15:01:00Z
- **Completed:** 2026-07-24T15:11:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added locked DBTX operations to load, replace, seed, and synchronize normalized complete release crew snapshots.
- Preserved proposed, draft, disputed, and hidden contribution rows by limiting every effective read and replacement to confirmed rows.
- Replaced the two-step release/project read fallback with one stored snapshot read and explicit `inherited|independent` metadata.
- Kept empty independent snapshots unambiguous through the persisted snapshot context.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Snapshot repository contracts** - `e89c5d46` (test)
2. **Task 1 GREEN: Complete snapshot repository** - `2b232435` (feat)
3. **Task 2 RED: Stored-only effective read contracts** - `6c2c4138` (test)
4. **Task 2 GREEN: Stored-only repository and handler path** - `fb4840c5` (feat)
5. **Task 1 correctness follow-up: Concurrent inherited-mode recheck** - `e70b01da` (fix)

## Files Created/Modified

- `backend/internal/repository/release_crew_snapshot_repository.go` - Complete-set storage, canonical context validation, advisory locking, confirmed project seeding, and inherited-only synchronization.
- `backend/internal/repository/release_crew_snapshot_repository_test.go` - Normalization, stored snapshot, confirmed-only, and inherited-sync contract tests.
- `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go` - Adapter from stored snapshot rows to the existing effective contribution DTO.
- `backend/internal/repository/admin_content_fansub_releases_contributions_repository_test.go` - Static regression against fallback reintroduction.
- `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go` - Snapshot-mode response metadata after the existing permission gate.
- `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go` - Exact empty independent response and permission-first coverage.

## Decisions Made

- A missing snapshot is an error, not an empty or project-derived result; only an existing context row can represent an empty independent crew.
- Synchronization enumerates inherited snapshots and then rechecks each mode under its context lock, closing the race with the first manual edit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Rechecked inherited mode under the context lock**
- **Found during:** Self-review after Task 2
- **Issue:** A manual edit could make a snapshot independent after synchronization enumerated it but before replacement.
- **Fix:** Lock each release/group context, read `snapshot_mode FOR UPDATE`, and skip any context no longer inherited.
- **Files modified:** `backend/internal/repository/release_crew_snapshot_repository.go`
- **Verification:** Focused repository and complete repository/handler suites pass.
- **Committed in:** `e70b01da`

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality).
**Impact on plan:** The fix is required by the concurrency threat model and adds no new product scope.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Review

- Release/group writes validate the canonical `release_version_groups` context and lock that full context before mutation.
- Confirmed-only predicates protect open and historical review records from effective reads, replacement, seeding, and synchronization.
- The inherited-mode recheck serializes project synchronization against permanent release independence.
- No endpoint, auth path, schema, media ownership seam, ledger write, or data backfill was introduced.

## Verification

- `cd backend && go test ./internal/repository ./internal/handlers -run 'ReleaseCrewSnapshot|EffectiveContributions' -count=1` — passed.
- `cd backend && go test ./internal/repository ./internal/handlers -count=1` — passed.
- Legacy fallback/column scan — no executable `anime_default`, fallback query, or `fansubgroup_id` in the changed repositories.
- `git diff --check` — passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The stored complete-set seam is ready for Phase 108 service-level point orchestration and release-creation/project-sync wiring. No blockers remain.

## Self-Check: PASSED

- All six key files exist.
- All five task/deviation commits exist.
- All task acceptance criteria and plan verification commands pass.

---
*Phase: 108-bestehende-beitragsquellen-anbinden*
*Completed: 2026-07-24*
