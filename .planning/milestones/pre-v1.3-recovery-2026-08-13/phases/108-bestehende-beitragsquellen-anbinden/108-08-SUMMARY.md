---
phase: 108-bestehende-beitragsquellen-anbinden
plan: "08"
subsystem: backend-contribution-runtime
tags: [go, pgx, release-crew, transactions, runtime-wiring, tdd]
requires:
  - phase: 108-03
    provides: Atomic release crew snapshots and point-diff service
  - phase: 108-04
    provides: Transactional project-note credit service
  - phase: 108-07
    provides: Release-creation crew seeder hooks
provides:
  - Project-only generic contribution mutation boundary
  - Atomic project row, inherited snapshot, and point-ledger synchronization
  - One production ReleaseCrewService shared by all handlers and release creators
affects: [contribution-admin, release-crew, proposal-confirmation, release-creation]
tech-stack:
  added: []
  patterns:
    - Service-owned pgx transaction spanning canonical project mutation and inherited fan-out
    - Production composition root injects one shared domain service into every mutation owner
key-files:
  created:
    - backend/internal/handlers/fansub_anime_contributions_handler_test.go
    - backend/cmd/server/phase108_runtime_wiring_test.go
  modified:
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/internal/handlers/fansub_anime_contributions_delete_handler.go
    - backend/internal/handlers/fansub_contributions_validation_test.go
    - backend/internal/repository/anime_contributions_upsert_repository.go
    - backend/internal/repository/anime_contributions_member_repository.go
    - backend/internal/services/release_crew_service.go
    - backend/cmd/server/main.go
key-decisions:
  - "Generic POST, PATCH, and DELETE own only release_version_id-NULL project rows; complete-set PUT remains the sole release crew mutation."
  - "Only before-or-after confirmed project truth invokes inherited snapshot synchronization and point diffs."
  - "The composition root constructs one PointService-backed ReleaseCrewService before both release repositories and injects that same instance everywhere."
requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]
duration: 7 min
completed: 2026-07-24
---

# Phase 108 Plan 08: Project Mutation Hardening and Runtime Wiring Summary

**Generic project-roster writes now atomically synchronize only inherited release crews and points, while one shared production service graph owns every project, release, review, note, and creation path**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-24T15:55:37Z
- **Completed:** 2026-07-24T16:02:38Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Rejected every generic release-specific POST/PATCH/DELETE, including null/same/different PATCH payloads and stored release-specific targets.
- Rejected generic PATCH review-status changes so leader/member confirmation commands remain the only promotion owners.
- Added one service transaction spanning project upsert/patch/delete, inherited-only snapshot synchronization, point awards/reversals/restorations, and commit.
- Kept draft, proposed, disputed, and hidden project CRUD from changing effective release crews or ledger state.
- Injected the same `ReleaseCrewService` into generic handlers, complete-set Replace, leader/member confirmations, import creation, and manual release creation.
- Proved every Phase-108 production route remains registered and the service is constructed exactly once.

## Task Commits

1. **Task 1 RED: project mutation boundary tests** - `c0343167`
2. **Task 1 GREEN: atomic project-only mutations** - `782c26e4`
3. **Task 2 RED: production graph tests** - `e06f4d85`
4. **Task 2 GREEN: shared runtime service graph** - `9929b154`

## Decisions Made

- Generic project mutation validation is permission-first, then payload/scoped-target validation, then one transactional service command.
- Confirmed-before or confirmed-after is the fan-out predicate, covering confirmed role edits as well as confirmed removal/demotion without allowing generic PATCH status transitions.
- Existing admin-content, review, member, and route seams were reused; no handler-local service or parallel API contract was introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added the service-owned project mutation boundary**
- **Found during:** Task 1
- **Issue:** The plan required `ReleaseCrewService.ApplyProjectRosterMutation`, but the method did not exist and `release_crew_service.go` was omitted from the declared 11-file scope.
- **Fix:** Added the minimal command and transaction method to the existing service; no parallel service was created.
- **Files modified:** `backend/internal/services/release_crew_service.go`
- **Verification:** Focused project mutation tests and full backend suite pass.
- **Commit:** `782c26e4`

**2. [Rule 1 - Regression] Replaced the obsolete generic release-participation assertion**
- **Found during:** Task 1 full handler suite
- **Issue:** A prior static regression still required generic POST/PATCH to accept release-version assignment, contradicting the new project-only boundary.
- **Fix:** Asserted both generic paths reject any carried `release_version_id` instead.
- **Files modified:** `backend/internal/handlers/fansub_contributions_validation_test.go`
- **Verification:** Full handler suite passes.
- **Commit:** `782c26e4`

**Total deviations:** 2 auto-fixed (1 missing critical boundary, 1 directly affected regression).
**Impact:** Both are required for the plan’s locked ownership contract; no schema, content import, backfill, endpoint, or unrelated feature was added.

## Known Stubs

None.

## Threat Review

- T-108-22: one outer transaction rolls back project mutation, inherited fan-out, and ledger work together.
- T-108-23: inherited synchronization retains the `snapshot_mode='inherited'` predicate; independent snapshots never enter the mutation set.
- T-108-24: payload and stored-target rejection prevent generic release ownership moves.
- T-108-25: production-graph tests require one shared service instance across every live mutation owner and both creators.
- No new endpoint, schema, auth path, file access, media ownership, or content migration surface was introduced.

## Verification

- Focused Task 1 command - passed.
- Focused Task 2 production graph and route command - passed.
- `go test ./internal/handlers ./internal/repository ./internal/services -count=1` - passed.
- `go test ./... -count=1` - passed.
- `git diff --check` - passed.
- TDD gate order: `c0343167` before `782c26e4`, and `e06f4d85` before `9929b154` - passed.

## Self-Check: PASSED

- All nine created or modified implementation files exist.
- Commits `c0343167`, `782c26e4`, `e06f4d85`, and `9929b154` exist.
- Both task acceptance gates and the plan-level verification pass.

## Next Phase Readiness

The production graph is complete for Phase 108 verification. No blocker remains.
