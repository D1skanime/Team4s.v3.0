---
phase: 11-anisearch-edit-enrichment-and-relation-persistence
plan: 04
subsystem: ui
tags: [react, nextjs, vitest, admin, anisearch]
requires:
  - phase: 11-03
    provides: edit-route AniSearch card, shared hook seam, and draft hydration flow
provides:
  - Edit AniSearch helper parsing for backend 409 conflict data envelopes
  - Hook state that separates duplicate-owner conflicts from generic error text
  - In-card redirect action for duplicate AniSearch ownership on the edit route
affects: [admin-anime-edit, anisearch, enrichment-conflicts]
tech-stack:
  added: []
  patterns: [ApiError conflict payload attachment, hook-managed conflict vs error state, in-card redirectable duplicate handling]
key-files:
  created: []
  modified: [frontend/src/lib/api.ts, frontend/src/lib/api.admin-anime.test.ts, frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts, frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.test.ts, frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx, frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.test.tsx, frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx]
key-decisions:
  - "The shared edit AniSearch helper keeps the success DTO unchanged and attaches duplicate-owner metadata to ApiError only for the edit enrichment seam."
  - "The edit workspace consumes hook-managed conflict state directly so duplicate AniSearch ownership renders inside the existing card instead of falling back to generic error text."
patterns-established:
  - "Real backend 409 AniSearch edit conflicts are parsed from the response data envelope before throwing ApiError."
  - "Operator redirect actions for duplicate AniSearch ownership stay inside the existing CSS-module AniSearch card, not in a toast or modal."
requirements-completed: [ENR-08]
duration: 6min
completed: 2026-04-09
---

# Phase 11 Plan 04: AniSearch Edit Conflict Redirect Summary

**Edit-route AniSearch duplicate conflicts now preserve backend redirect metadata through the shared helper and render an in-card jump to the owning anime**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-09T15:37:00Z
- **Completed:** 2026-04-09T15:42:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Parsed the real backend `409 { data: ... }` AniSearch conflict envelope and attached typed redirect metadata to `ApiError`.
- Extended the edit AniSearch hook so duplicate-owner conflicts are stored separately from generic error text and cleared after successful retries.
- Added an operator-visible conflict branch in the existing AniSearch edit card with the owning anime title and a `Zum vorhandenen Anime wechseln` action.

## Task Commits

Each task was committed atomically:

1. **Task 1: Parse and expose edit AniSearch conflict metadata through the shared helper and hook** - `932b5b6` (test), `4361344` (feat)
2. **Task 2: Surface the duplicate AniSearch redirect path in the existing edit workspace** - `d92173a` (test), `3f4bcde` (feat)

## Files Created/Modified
- `frontend/src/lib/api.ts` - Parses edit-only AniSearch conflict envelopes and preserves redirect metadata on `ApiError`.
- `frontend/src/lib/api.admin-anime.test.ts` - Covers the real backend conflict envelope and the unchanged success response shape.
- `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts` - Stores typed conflict state separately from generic error text.
- `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.test.ts` - Verifies conflict-state handling and stale-conflict clearing on success.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx` - Renders duplicate-owner messaging and the redirect action inside the existing card.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.test.tsx` - Covers the duplicate-owner branch while preserving success and empty states.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` - Passes hook conflict state into the card and stops collapsing duplicate conflicts into generic error handling.

## Decisions Made

- Kept conflict parsing scoped to `loadAdminAnimeEditAniSearchEnrichment` so unrelated API error paths do not gain edit-specific envelope logic.
- Used the hook as the single source of truth for AniSearch conflict/error feedback so the workspace can switch UI branches without re-parsing thrown errors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `rg` was not executable in this shell environment, so targeted `Select-String` reads were used instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ENR-08 is now closed end-to-end from backend conflict payload to operator-facing redirect action in the edit card.
- Phase 11 follow-up is narrowed to Plan 11-05 create-route warning contract alignment and operator-visible follow-through messaging.

## Self-Check: PASSED

- Found summary file: `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-04-SUMMARY.md`
- Found task commit: `932b5b6`
- Found task commit: `4361344`
- Found task commit: `d92173a`
- Found task commit: `3f4bcde`

---
*Phase: 11-anisearch-edit-enrichment-and-relation-persistence*
*Completed: 2026-04-09*
