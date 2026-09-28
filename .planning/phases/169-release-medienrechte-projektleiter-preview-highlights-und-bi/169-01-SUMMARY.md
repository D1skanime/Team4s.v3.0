---
phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi
plan: 01
subsystem: database
tags: [postgres, go, permissions, release-version-media, highlights]

requires:
  - phase: 168
    provides: release-version media repository and effective-rights resolver
provides:
  - additive release-version media highlight persistence with deterministic ordering
  - independent highlight DTO projection alongside existing preview state
  - dedicated project-scoped reorder and highlight capability actions
affects: [169-02, 169-04, release-version-media, permissions]

tech-stack:
  added: []
  patterns:
    - transactional release-version ownership validation before highlight mutation
    - separate highlight relation instead of overloading preview state

key-files:
  created:
    - database/migrations/0172_release_version_media_highlights.up.sql
    - database/migrations/0172_release_version_media_highlights.down.sql
  modified:
    - backend/internal/repository/release_version_media_repository.go
    - backend/internal/repository/release_version_media_repository_test.go
    - backend/internal/repository/release_version_media_replace_repository_test.go
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/effective_rights_test.go
    - backend/internal/permissions/capability_registry_test.go

key-decisions:
  - "Highlights use a separate release_version_media_highlights relation; preview remains is_preview_candidate."
  - "Reorder and highlight are separate user-overridable actions resolved through CanForReleaseVersion."
  - "No existing media rows are backfilled and no release_media or legacy fansubgroup_id seam is introduced."

patterns-established:
  - "Highlight writes accept only release_version_id and release_version_media_id and verify ownership inside the transaction."
  - "Multiple same-category highlights coexist and are ordered by highlight_order."

requirements-completed: [REQ-169-01, REQ-169-02, REQ-169-03]

duration: 9 min
completed: 2026-09-28
---

# Phase 169 Plan 01: Release-Medienrechte, Projektleiter, Preview, Highlights und Bildreihenfolge Summary

**Canonical release-version highlight persistence and project-scoped curation rights, with preview state kept independent**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-28T17:54:57Z
- **Completed:** 2026-09-28T18:03:32Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added reversible migration 0172 with a cascade-backed highlight relation, non-negative ordering, deterministic index, and project-lead capability seeds.
- Extended the existing release-version media repository with highlight read projection, transactional upsert/remove/reorder methods, ownership checks, duplicate/order validation, and independent preview behavior.
- Registered separate reorder/highlight actions in the canonical permission catalog and covered project-lead allow, user-deny precedence, same-category coexistence, ordering, removal, and foreign-version rejection.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add highlight relation and repository seam** - `c2b9cfba` (test RED), `dc286d56` (feat), `a5338462` (fix)
2. **Task 2: Register separate project-scoped actions** - `98c5f1df` (feat)

## Files Created/Modified

- `database/migrations/0172_release_version_media_highlights.up.sql` - additive relation and action catalog seed.
- `database/migrations/0172_release_version_media_highlights.down.sql` - scoped reversible rollback.
- `backend/internal/repository/release_version_media_repository.go` - highlight DTO projection and transactional mutations.
- `backend/internal/repository/release_version_media_repository_test.go` - repository seam and integration coverage.
- `backend/internal/repository/release_version_media_replace_repository_test.go` - shared disposable fixture relation.
- `backend/internal/permissions/permissions.go` - dedicated action constants and all-known registry.
- `backend/internal/permissions/effective_rights_test.go` - direct-denial and separate-action coverage.
- `backend/internal/permissions/capability_registry_test.go` - independent action catalog parity.

## Decisions Made

- Preview remains a property of `release_version_media`; highlights are stored independently so multiple same-category highlights can coexist.
- Existing `CanForReleaseVersion` and user/group override precedence remain the only rights authority; no parallel rights store was added.
- Repository mutation methods require the real release-version relation and reject foreign or deleted media before writes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated the shared disposable repository fixture**
- **Found during:** Task 1
- **Issue:** Existing ListReleaseVersionMedia tests use a disposable fixture that predates migration 0172; the new canonical LEFT JOIN would otherwise fail before the migration is present.
- **Fix:** Added the additive highlight table and ordering index to the shared test fixture.
- **Files modified:** `backend/internal/repository/release_version_media_replace_repository_test.go`
- **Verification:** Focused repository media/highlight test suite passes.
- **Committed in:** `dc286d56`

**2. [Rule 1 - Bug] Removed a forbidden literal backfill marker from migration commentary**
- **Found during:** Final forbidden-seam scan
- **Issue:** The migration had no backfill behavior, but its explanatory comment contained the literal scan term.
- **Fix:** Reworded the comment to state that existing rows remain unchanged.
- **Files modified:** `database/migrations/0172_release_version_media_highlights.up.sql`
- **Verification:** Migration scan, `git diff --check`, and focused tests pass.
- **Committed in:** `a5338462`

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 3)
**Impact on plan:** Both changes were required to preserve existing test correctness and satisfy the explicit no-backfill/no-legacy scan; no product scope was added.

## Issues Encountered

- The project GSD wrapper exposes the legacy `gsd-tools` command surface rather than the newer `gsd-sdk query` surface. State updates were run through the available wrapper handlers below.
- No live database schema or row data was changed. Migration up/down SQL was executed inside explicit transactions and rolled back.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for Plan 169-02 to add the authoritative admin highlight/reorder API and shared contracts using the repository methods and actions delivered here.
- No known stubs or unaddressed threat flags in files changed by this plan.

---
*Phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi*
*Completed: 2026-09-28*

## Self-Check: PASSED

- Summary file exists and all key files were found.
- Task commits c2b9cfba, dc286d56, 98c5f1df, and a5338462 exist in git history.
