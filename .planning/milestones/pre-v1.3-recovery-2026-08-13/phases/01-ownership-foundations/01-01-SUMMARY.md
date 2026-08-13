---
phase: 01-ownership-foundations
plan: 01
subsystem: database
tags: [go, postgres, pgx, repository, anime-metadata]
requires: []
provides:
  - Authoritative anime title and genre writes mirrored into normalized metadata tables
  - Genre token suggestions sourced from the same normalized genre store as anime reads
  - Repository regression coverage for title replacement and genre clearing semantics
affects: [phase-01-02, phase-01-03, admin-anime-editor, jellyfin-intake]
tech-stack:
  added: []
  patterns: [transactional dual-write to legacy and normalized metadata tables, repository-level authority contract helpers]
key-files:
  created: [backend/internal/repository/admin_content_anime_metadata.go]
  modified: [backend/internal/repository/admin_content.go, backend/internal/repository/admin_content_test.go, backend/internal/repository/anime.go]
key-decisions:
  - "Admin title and genre edits now update legacy anime columns and normalized metadata tables in one transaction."
  - "Editable titles map to normalized slots as romaji/main, de/main, and en/official so AnimeRepository reads the same values back."
  - "Genre suggestions now query anime_genres plus genres instead of tokenizing legacy anime.genre strings."
patterns-established:
  - "Split oversized repository files by responsibility before adding more admin-anime behavior."
  - "Model read/write authority mismatches with repository helper tests before layering UI work on top."
requirements-completed: [INTK-06, RLY-04]
duration: 6 min
completed: 2026-03-24
---

# Phase 1 Plan 1: Ownership Foundations Summary

**Transactional authority syncing for anime titles and genres across `anime`, `anime_titles`, and `anime_genres` with repository regressions guarding reload behavior**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-24T13:00:18+01:00
- **Completed:** 2026-03-24T13:06:05+01:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Split admin anime metadata persistence into [`backend/internal/repository/admin_content_anime_metadata.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content_anime_metadata.go) so [`backend/internal/repository/admin_content.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content.go) dropped from 741 lines to 517.
- Kept editable title and genre writes authoritative by mirroring them into normalized tables in the same transaction as legacy `anime` column updates.
- Added repository regressions covering normalized title replacement, genre replacement and clearing, and authoritative genre-token filtering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Split authoritative anime metadata writes into a dedicated repository seam** - `f9303ea` (test), `d4df091` (feat)
2. **Task 2: Add repository regressions that prove title and genre edits survive reloads** - `c16fd03` (test), `170eaa9` (feat)

## Files Created/Modified
- [`backend/internal/repository/admin_content_anime_metadata.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content_anime_metadata.go) - dedicated admin anime metadata write seam, transactional normalized sync, and authoritative genre token query/filtering.
- [`backend/internal/repository/admin_content.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content.go) - slimmed repository file after moving anime metadata logic out.
- [`backend/internal/repository/admin_content_test.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content_test.go) - authority contract and reload regression tests.
- [`backend/internal/repository/anime.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/anime.go) - normalized genre overlay now also updates the `Genre` string field for read consistency.

## Decisions Made

- Used dual writes instead of switching authority entirely to normalized tables so existing code paths depending on legacy `anime.title*` and `anime.genre` stay compatible during Phase 1.
- Encoded editable admin titles into deterministic normalized slots that align with the existing `mergeNormalizedAnimeMetadata` priority rules.
- Extracted reusable helper logic for authority application and genre-token filtering so repository tests can assert reload semantics without a DB integration harness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced placeholder repository coverage with helper-based authority regressions**
- **Found during:** Task 2
- **Issue:** Existing repository test helpers only called `t.Skip`, so the planned verification would not exercise the new authority contract.
- **Fix:** Added helper-driven repository tests around metadata application and genre token filtering so the repository slice now enforces authority behavior in-process.
- **Files modified:** `backend/internal/repository/admin_content_anime_metadata.go`, `backend/internal/repository/admin_content_test.go`
- **Verification:** `go test ./internal/repository -run 'TestAdminContentRepository|TestAnimeRepository' -count=1`
- **Committed in:** `170eaa9`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation kept the plan within scope while replacing non-enforcing placeholder coverage with executable regressions.

## Issues Encountered

- The worktree already contained uncommitted normalized-read changes in [`backend/internal/repository/anime.go`](C:/Users/admin/Documents/Team4s/backend/internal/repository/anime.go). The plan implementation was integrated on top of that file instead of reverting it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 now has an explicit repository authority contract for editable anime titles and genres.
- Phase 01-02 can build audit attribution on top of a backend write path that no longer diverges from normalized reads.

## Self-Check

PASSED

---
*Phase: 01-ownership-foundations*
*Completed: 2026-03-24*
