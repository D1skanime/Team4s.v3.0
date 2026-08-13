---
phase: 16-hide-already-imported-anisearch-candidates-on-create
plan: 01
subsystem: api
tags: [go, gin, anisearch, admin, testing]
requires:
  - phase: 12-create-anisearch-intake-reintroduction-and-draft-merge-control
    provides: create AniSearch enrichment and duplicate-ownership seams
  - phase: 15-asset-specific-online-search-and-selection-for-create-page-anime-assets
    provides: current create-route provider search baseline
provides:
  - duplicate-safe AniSearch title search results on the backend create seam
  - filtered_existing_count metadata for caller-visible hidden-duplicate feedback
  - service and handler regressions for mixed-result and filtered result cases
affects: [frontend create AniSearch search UI, phase-16 plan-02]
tech-stack:
  added: []
  patterns: [batch source ownership filtering, typed search result envelopes]
key-files:
  created: [.planning/phases/16-hide-already-imported-anisearch-candidates-on-create/16-01-SUMMARY.md]
  modified:
    - backend/internal/services/anime_create_enrichment.go
    - backend/internal/services/anime_create_enrichment_test.go
    - backend/internal/handlers/admin_content_anime_enrichment_search.go
    - backend/internal/handlers/admin_content_test.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_enrichment_edit_test.go
    - backend/internal/models/admin_content.go
key-decisions:
  - "AniSearch title-search duplicate suppression remains in the backend service by resolving candidate batches through existing anisearch:{id} source ownership."
  - "The AniSearch search handler now returns a typed response envelope so callers can distinguish no raw hits from all hits being filtered locally."
patterns-established:
  - "AniSearch search responses use typed result DTOs when metadata beyond candidate lists is required."
  - "Create-side provider search filtering should reuse existing repository ownership seams instead of adding frontend-only hide logic."
requirements-completed: []
duration: 4min
completed: 2026-04-16
---

# Phase 16 Plan 01: Backend AniSearch duplicate filtering with filtered-result metadata

**AniSearch create title search now strips already-imported `anisearch:{id}` candidates in the backend and reports how many hits were hidden.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-16T07:24:00Z
- **Completed:** 2026-04-16T07:27:23Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added red regressions proving duplicate AniSearch candidates must be hidden before the create UI renders them.
- Updated the backend AniSearch search seam to batch-resolve local `anisearch:{id}` ownership and filter matching candidates.
- Exposed `filtered_existing_count` in the handler response so the next UI slice can distinguish filtered-empty results from true no-hit results.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock duplicate-safe AniSearch search behavior in service and handler regressions** - `dbe4048` (test)
2. **Task 2: Implement backend filtering and filtered-result metadata on the AniSearch search seam** - `49e1623` (feat)

## Files Created/Modified
- `backend/internal/services/anime_create_enrichment.go` - Filters AniSearch title-search results against existing local source ownership.
- `backend/internal/services/anime_create_enrichment_test.go` - Covers mixed search results where one AniSearch ID is already imported locally.
- `backend/internal/handlers/admin_content_anime_enrichment_search.go` - Returns the typed AniSearch search result envelope directly.
- `backend/internal/handlers/admin_content_test.go` - Verifies filtered search responses include `filtered_existing_count`.
- `backend/internal/models/admin_content.go` - Defines the AniSearch search result/response DTO.
- `backend/internal/handlers/admin_content_handler.go` - Widens the AniSearch search interface to the new result contract.
- `backend/internal/handlers/admin_content_anime_enrichment_edit_test.go` - Keeps the edit-route stub aligned with the widened interface.

## Decisions Made
- Kept duplicate suppression in `AnimeCreateEnrichmentService.SearchAniSearchCandidates` so all callers share one ownership rule.
- Reused `ResolveAdminAnimeRelationTargetsBySources` for batched AniSearch source checks instead of adding a new repository path.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The red test commit intentionally failed to compile until the search seam was widened from a plain slice to a typed result envelope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 16-02 can now consume `filtered_existing_count` to render honest empty-state copy on the create UI.
- No backend blocker remains for the UI distinction between raw-empty and filtered-empty AniSearch search results.

## Self-Check

PASSED

- Found `.planning/phases/16-hide-already-imported-anisearch-candidates-on-create/16-01-SUMMARY.md`
- Verified task commits `dbe4048` and `49e1623` exist in git history
- Stub scan found no placeholder or TODO patterns in the touched backend files

---
*Phase: 16-hide-already-imported-anisearch-candidates-on-create*
*Completed: 2026-04-16*
