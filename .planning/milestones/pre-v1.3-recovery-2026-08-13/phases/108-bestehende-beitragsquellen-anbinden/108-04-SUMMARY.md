---
phase: 108-bestehende-beitragsquellen-anbinden
plan: "04"
subsystem: backend
tags: [postgresql, pgx, point-ledger, project-notes, tdd]

requires:
  - phase: 108-01
    provides: Project-note lifecycle table and immutable five-point rule
  - phase: 106-member-gamification-punktefundament
    provides: Transactional PointService and append-only ledger
provides:
  - Atomic canonical project-note and first-author credit lifecycle
  - Permanent skipped generation for an unlinked first writer
  - Award reversal on deletion and fresh author evaluation on recreation
affects: [108-05, 108-06, project-notes, member-gamification]

tech-stack:
  added: []
  patterns:
    - Caller-owned pgx transaction spans canonical note mutation, lifecycle state, and ledger writes
    - Advisory context lock serializes first-author generation selection

key-files:
  created:
    - database/migrations/0138_project_note_first_author_lifecycle.up.sql
    - database/migrations/0138_project_note_first_author_lifecycle.down.sql
    - backend/internal/migrations/phase108_project_note_lifecycle_test.go
    - backend/internal/services/project_note_credit_service.go
    - backend/internal/services/project_note_credit_service_test.go
    - backend/internal/handlers/admin_content_anime_project_notes_test.go
  modified:
    - backend/internal/repository/anime_project_notes_repository.go
    - backend/internal/handlers/admin_content_anime_project_notes.go
    - backend/internal/handlers/admin_content_anime_project_notes_test.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_fansub_notes_test.go
    - backend/cmd/server/main.go

key-decisions:
  - "Persist the authenticated first writer independently from the nullable member beneficiary so an unlinked author consumes the generation permanently."
  - "Resolve point beneficiaries only from a verified member claim at the first non-empty transition; later linkage and editors never replace that author."
  - "Keep project-note handlers free of ledger policy and pass only authenticated app-user identity plus canonical route context to the service."

patterns-established:
  - "Project-note lifecycle: absent or trimmed-empty to non-empty consumes exactly one generation under an advisory transaction lock."
  - "Skipped generation: skipped_no_member has an actual app-user author, no member, no award, and no deletion reversal."

requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]

duration: 25 min
completed: 2026-07-24
---

# Phase 108 Plan 04: Transactional Project-Note First-Author Credit Summary

**Canonical project text now awards one eligible first author five points atomically, permanently records unlinked first writers as skipped, reverses awarded deletions, and starts a fresh lifecycle on recreation**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-24T14:58:00Z
- **Completed:** 2026-07-24T15:23:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added a reversible schema correction that records the actual app-user writer even when no historical member is linked, without importing or carrying forward content.
- Added a transaction service that serializes note generations and commits note content, lifecycle state, awards, and reversals together.
- Proved an unlinked generation cannot transfer its five points to a later editor or later member linkage, while recreation evaluates the new first writer.
- Routed the existing admin project-note endpoints through the lifecycle service without changing routes, content ownership, permission gates, or response shape.

## Task Commits

1. **Authorized schema deviation: represent unlinked first authors** - `415b2d5c` (fix)
2. **Task 1 RED: project-note lifecycle tests** - `6560a21b` (test)
3. **Task 1 GREEN: atomic note and credit lifecycle** - `7592940d` (feat)
4. **Task 2 RED: handler delegation tests** - `e9ac8aff` (test)
5. **Task 2 GREEN: route mutations through service** - `4a054a07` (feat)
6. **Task 2 regression alignment** - `a9131640` (test)

## Files Created/Modified

- `database/migrations/0138_project_note_first_author_lifecycle.up.sql` - Adds actual writer identity, nullable beneficiary, skipped state, and lifecycle constraints.
- `database/migrations/0138_project_note_first_author_lifecycle.down.sql` - Reverses the schema when no unlinked lifecycle history would be destroyed.
- `backend/internal/migrations/phase108_project_note_lifecycle_test.go` - Up/down, constraint, and no-content-carry-forward proof.
- `backend/internal/services/project_note_credit_service.go` - Atomic upsert, deletion reversal, recreation, locking, and beneficiary resolution.
- `backend/internal/services/project_note_credit_service_test.go` - Linked/unlinked, delete/recreate, rollback, and concurrency regressions.
- `backend/internal/repository/anime_project_notes_repository.go` - DBTX-compatible canonical note mutations.
- `backend/internal/handlers/admin_content_anime_project_notes.go` - Existing mutations delegate to the service after permission/context validation.
- `backend/internal/handlers/admin_content_anime_project_notes_test.go` - Delegation, response, authorization, and context tests.
- `backend/internal/handlers/admin_content_handler.go` - Lifecycle dependency seam.
- `backend/internal/handlers/admin_content_fansub_notes_test.go` - Existing source invariant updated for the transactional service.
- `backend/cmd/server/main.go` - Production dependency wiring.

## Decisions Made

- The first authenticated writer is durable lifecycle identity even when no member beneficiary exists.
- Only a verified `member_claims` link present during the first trimmed non-empty transition can receive the award.
- Project-note reviewers, admins acting later, metadata edits, release-version notes, and media do not enter this point path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 - Authorized Architecture] Corrected the lifecycle schema with migration 0138**
- **Found during:** Task 1 preflight
- **Issue:** Migration 0137 required a non-null member and had no actual writer or skipped state, making the locked unlinked-first-author behavior unrepresentable.
- **Fix:** After explicit authorization, added a new reversible migration; migration 0137 remained untouched.
- **Files modified:** `database/migrations/0138_project_note_first_author_lifecycle.*.sql`, `backend/internal/migrations/phase108_project_note_lifecycle_test.go`
- **Verification:** Focused and full migration suites pass; executable migration contains no project-note content copy.
- **Committed in:** `415b2d5c`

**2. [Rule 1 - Regression] Updated the pre-existing direct-repository source assertion**
- **Found during:** Full handler suite after Task 2
- **Issue:** A static test still required project-note delete to call the repository directly, contradicting the planned transactional service seam.
- **Fix:** Asserted route context and authenticated app-user identity reach the lifecycle service instead.
- **Files modified:** `backend/internal/handlers/admin_content_fansub_notes_test.go`
- **Verification:** Full affected handler suite passes.
- **Committed in:** `a9131640`

---

**Total deviations:** 2 (1 explicitly authorized schema correction, 1 auto-fixed regression).
**Impact on plan:** Both changes are necessary to implement the locked lifecycle truthfully; no parallel content, identity, review, or ledger seam was introduced.

## Issues Encountered

- The initial Phase-108 lifecycle schema could not represent an unlinked author. Execution paused at the required decision checkpoint and resumed only after authorization for migration 0138.

## Known Stubs

None.

## Threat Review

- The browser cannot choose actor, beneficiary, point value, rule, generation, or ledger key.
- Advisory transaction locking prevents concurrent writers from claiming the same first-author transition.
- Permission and anime/fansub route-context checks run before handler mutation.
- The only new trust-boundary surface is the authorized migration constraint correction; no endpoint, file access, auth flow, or media ownership surface was added.

## Verification

- `go test ./internal/migrations ./internal/services ./internal/repository ./internal/handlers ./cmd/server -count=1` - passed.
- `go test ./internal/services -run 'ProjectNote.*(Concurrent|Retry|Rollback)' -count=20` - passed.
- Focused service/repository and handler plan commands - passed.
- Handler ledger-policy scan - no matches.
- `git diff --check 5225a3e0..HEAD` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Project-note first-author points are complete and ready for later Phase-108 integration and verification plans. No blockers remain.

## Self-Check: PASSED

- All twelve created or modified implementation files exist.
- Commits `415b2d5c`, `6560a21b`, `7592940d`, `e9ac8aff`, `4a054a07`, and `a9131640` exist.
- Every task acceptance criterion and plan-level verification command passes.

---
*Phase: 108-bestehende-beitragsquellen-anbinden*
*Completed: 2026-07-24*
