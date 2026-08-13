---
phase: 128-canonical-public-identity-visibility-foundation
plan: 08
subsystem: backend-repository
tags: [postgresql, public-identity, archive, ranking, privacy]
requires:
  - phase: 128-04
    provides: Required immutable members.public_slug and closed public/private visibility
provides:
  - Archive results select stored canonical member slugs directly
  - Point-ranking results select stored canonical member slugs directly
  - Focused source and PostgreSQL regressions reject generated or numeric identity fallback
affects: [128-10, 128-13, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Public-only projections select members.public_slug directly
    - Phase-128 PostgreSQL tests use the explicit fail-closed Phase-128 fixture
key-files:
  created: []
  modified:
    - backend/internal/repository/member_archive_repository.go
    - backend/internal/repository/member_archive_repository_test.go
    - backend/internal/repository/member_point_totals_repository.go
    - backend/internal/repository/member_point_totals_repository_test.go
key-decisions:
  - "Archive and ranking projections select members.public_slug directly because their queries already enforce public visibility."
patterns-established:
  - "Stored identity only: public archive and ranking links never derive identity from nickname or member ID."
requirements-completed: [PMID-03]
metrics:
  duration: 12m
  completed: 2026-08-13
---

# Phase 128 Plan 08: Canonical Archive and Ranking Identity Summary

**Public archive and point-ranking results now emit immutable stored member slugs, with focused source and live PostgreSQL coverage rejecting nickname-derived or numeric fallback identity.**

## Performance

- **Duration:** 12m
- **Started:** 2026-08-13T14:33:29Z
- **Completed:** 2026-08-13T14:45:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced the archive's formatted nickname slug with direct `m.public_slug` selection while preserving public filters, search behavior, ordering, and DTO fields.
- Replaced the point-ranking nickname slug expression with direct `m.public_slug` selection while preserving totals, ordering, tie-breaks, pagination, and nullable unrelated fields.
- Added source contracts that reject nickname regexes, `memberSlugExpr`, numeric IDs, or `public_slug` fallback logic in both public-only projections.
- Proved ranking slugs remain stable after nicknames diverge from stored slugs through the guarded Phase-128 PostgreSQL fixture.

## Task Commits

Each TDD task was committed atomically through RED and GREEN:

1. **Task 1 RED: Require stored archive identity** - `5a6690e3` (test)
2. **Task 1 GREEN: Select stored archive slug** - `543763da` (feat)
3. **Task 2 RED: Require stored ranking identity** - `74c9c642` (test)
4. **Task 2 GREEN: Select stored ranking slug** - `fdd9e78b` (feat)

## Files Created/Modified

- `backend/internal/repository/member_archive_repository.go` - Direct canonical slug selection for public archive rows.
- `backend/internal/repository/member_archive_repository_test.go` - Stored-slug and no-fallback source invariant.
- `backend/internal/repository/member_point_totals_repository.go` - Direct canonical slug selection for ranking rows.
- `backend/internal/repository/member_point_totals_repository_test.go` - Stored-slug source invariant and live nickname-change regression on the Phase-128 fixture.

## Verification

- `go test ./internal/repository -run 'MemberArchive|MemberSlug' -count=1` with explicit `TEAM4S_PHASE128_TEST_DSN`: passed from canonical source mounted into a disposable Compose backend container.
- `go test ./internal/repository -run 'MemberPointTotals|Ranking|MemberSlug' -count=1` with explicit `TEAM4S_PHASE128_TEST_DSN`: passed, including concurrent totals, idempotency, reversal, ranking order/tie-break, page bounds, JSON fields, and canonical slug regressions.
- `go test ./internal/repository -run '^$' -count=1`: package compilation passed.
- `go vet ./internal/repository`: passed.
- Source invariants: both repositories select `m.public_slug AS slug`; neither contains `memberSlugExpr`, nickname regex derivation, numeric fallback, nor `COALESCE(m.public_slug, ...)`.
- Stub scan across all four changed files: passed with no TODO, FIXME, placeholder, coming-soon, or not-available markers.
- Repository-wide staged, unstaged, and HEAD `git diff --check`: passed.

## Decisions Made

- Selected `m.public_slug` without an additional visibility CASE because both owning queries already require `m.profile_visibility = 'public'`.
- Kept the existing nullable `*string` ranking/archive DTO field shape; contract cleanup belongs to the dedicated cross-layer plan, and this plan changes identity source only.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The long-running backend container did not mount canonical backend source. Focused verification used disposable Compose backend containers with `/home/d1sk/team4s/backend` bind-mounted, while retaining the project image, network, and explicit guarded test DSN.
- The previous point-ranking PostgreSQL fixture used the Phase-106 gate and could silently skip under the plan's Phase-128 DSN. The task-owned test fixture now uses `OpenPhase128Postgres`, applies migration 0145 before the point migrations, and executes the planned result regression instead of skipping.

## Known Stubs

None.

## Threat Flags

None - the plan changes existing read projections only and introduces no endpoint, auth path, file access, schema, or trust-boundary surface.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Archive and ranking outbound links now satisfy stored-identity Decision D-05.
- Plan 128-10 can remove the remaining shared nickname-derived slug expression after its remaining owned consumers are migrated.
- No blocker remains for subsequent Phase-128 plans.

## Self-Check: PASSED

All four modified repository files exist, commits `5a6690e3`, `543763da`, `74c9c642`, and `fdd9e78b` exist in Git, all task acceptance criteria and plan-level verification gates pass, and no goal-blocking stub remains.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
