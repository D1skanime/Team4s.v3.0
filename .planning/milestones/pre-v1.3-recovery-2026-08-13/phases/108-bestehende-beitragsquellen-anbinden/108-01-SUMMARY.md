---
phase: 108-bestehende-beitragsquellen-anbinden
plan: "01"
subsystem: database
tags: [postgresql, migrations, point-ledger, release-crew, tdd]

requires:
  - phase: 106-member-point-foundation
    provides: Immutable point rules and append-only point ledger
  - phase: 107-release-review
    provides: Current migration test fixture and lifecycle conventions
provides:
  - Canonical inherited/independent release crew snapshot state
  - Append-only release-role and project-note credit generation state
  - Immutable one-point release-role and five-point project-text rules
  - Executable proof that migration 0137 does not copy or reconcile disposable rows
affects: [108-02, 108-03, 108-04, contribution-services, project-notes]

tech-stack:
  added: []
  patterns:
    - Composite foreign keys bind source state to canonical release/group and anime/group contexts
    - Credit restoration creates a new generation while retaining award and reversal ledger references

key-files:
  created:
    - database/migrations/0137_phase108_contribution_sources.up.sql
    - database/migrations/0137_phase108_contribution_sources.down.sql
    - backend/internal/migrations/phase108_contribution_sources_test.go
  modified: []

key-decisions:
  - "Freeze rule codes as release_role_work v1 and project_text_first_author v1."
  - "Represent an empty independent crew with a standalone context snapshot row, not fallback behavior."
  - "Store each restored credit as a new positive generation with immutable ledger references."

patterns-established:
  - "Snapshot context: release_crew_snapshots is keyed by the canonical release_version_groups composite key."
  - "Lifecycle shape: pending, awarded, and reversed states constrain their award/reversal references."

requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]

duration: 8 min
completed: 2026-07-24
---

# Phase 108 Plan 01: Contribution Source Persistence Summary

**Canonical release-crew snapshots and append-only contribution credit generations with immutable 1-point and 5-point rules, without copying disposable data**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-24T14:58:48Z
- **Completed:** 2026-07-24T15:06:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added constrained inherited/independent snapshot state keyed to real release-version/group associations, including representable empty independent snapshots.
- Added generation-based release-role and project-note credit lifecycles that retain append-only award/reversal provenance.
- Seeded immutable `release_role_work` v1 at 1 point and `project_text_first_author` v1 at 5 points.
- Proved clean up/down behavior and rejected executable copy, mutation, reconciliation, and compatibility SQL.

## Task Commits

Each task was committed atomically:

1. **Task 1: Freeze the Phase-108 schema and no-backfill contract** - `a6666c69` (test)
2. **Task 2: Add reversible snapshot and credit lifecycle schema** - `9a91bfe7` (feat)

## Files Created/Modified

- `backend/internal/migrations/phase108_contribution_sources_test.go` - PostgreSQL up/down, fixed-rule, lifecycle-generation, constraint, and executable no-copy tests.
- `database/migrations/0137_phase108_contribution_sources.up.sql` - Canonical snapshot/lifecycle tables, constraints, indexes, and rule seeds.
- `database/migrations/0137_phase108_contribution_sources.down.sql` - Clean rollback with durable-history refusal and scoped rule removal.

## Decisions Made

- Rule codes are frozen as `release_role_work` v1 and `project_text_first_author` v1 so later services share stable semantic identities.
- An independent snapshot is represented by its context row even when it contains no crew units; no fallback flag or reset seam exists.
- Restoring a reversed release-role unit inserts a new generation rather than reusing the consumed award identity.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Review

- Composite foreign keys prevent source state from targeting a nonexistent release/group or anime/group association.
- Unique generation keys and lifecycle-shape checks preserve unambiguous award/reversal provenance.
- Static tests strip SQL comments before checking that no disposable rows are copied, reconciled, or awarded.
- No new endpoint, authentication path, file access pattern, or media ownership surface was introduced.

## Verification

- `cd backend && go test ./internal/migrations -run Phase108 -count=1` — passed.
- `cd backend && go test ./internal/migrations -count=1` — passed.
- Migration pair count — exactly the `up` and `down` files.
- Canonical-name/media guard — no forbidden matches.
- Executable no-copy guard — passed after SQL comments were stripped.
- `git diff --check` for all plan files — passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The canonical persistence contract is ready for Phase 108 service and repository implementation. No blockers remain.

## Self-Check: PASSED

- All three key files exist.
- Task commits `a6666c69` and `9a91bfe7` exist.
- All task acceptance criteria and plan verification commands pass.

---
*Phase: 108-bestehende-beitragsquellen-anbinden*
*Completed: 2026-07-24*
