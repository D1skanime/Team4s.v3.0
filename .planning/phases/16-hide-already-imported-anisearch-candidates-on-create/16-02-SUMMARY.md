---
phase: 16-hide-already-imported-anisearch-candidates-on-create
plan: 02
subsystem: ui
tags: [nextjs, react, typescript, vitest, anisearch]
requires:
  - phase: 16-hide-already-imported-anisearch-candidates-on-create
    provides: "Backend AniSearch search filtering and filtered-result envelope from 16-01"
provides:
  - "Typed AniSearch create-search responses with filtered-existing metadata"
  - "Create-route AniSearch filtered-empty feedback that distinguishes hidden duplicates from true no-hit searches"
  - "Card-level hidden-duplicate messaging without changing exact-ID redirect behavior"
affects: [phase-16, anisearch-create, admin-anime-create]
tech-stack:
  added: []
  patterns:
    - "Normalize widened API envelopes in the typed client before controller logic consumes them"
    - "Resolve create-route AniSearch search feedback in a small helper so UI messaging stays deterministic"
key-files:
  created: []
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/lib/api.admin-anime.test.ts
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
    - frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx
    - frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx
    - frontend/src/app/admin/anime/create/page.tsx
key-decisions:
  - "Default filtered_existing_count to 0 in the typed AniSearch client so downstream create logic does not branch on undefined metadata."
  - "Reuse the existing create card error/status channel for filtered-empty feedback and add a small explicit hint instead of introducing a new duplicate-only UI mode."
patterns-established:
  - "AniSearch title-search responses may carry operator-facing filtering metadata alongside candidate arrays."
  - "Filtered-empty create searches should explain hidden existing anime while exact-ID duplicate redirects stay unchanged."
requirements-completed: []
duration: 3min
completed: 2026-04-16
---

# Phase 16 Plan 02: Hide Already Imported AniSearch Candidates On Create Summary

**Filtered AniSearch create-search responses now carry duplicate-suppression metadata through the typed client, controller, and create card so hidden existing anime are explained instead of looking like zero hits.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-16T07:31:00Z
- **Completed:** 2026-04-16T07:34:19Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added red regressions for widened AniSearch title-search responses, filtered-empty controller feedback, and create-card hidden-duplicate messaging.
- Normalized `filtered_existing_count` in the typed AniSearch search client and resolved filtered-empty feedback in the create controller through a dedicated helper.
- Surfaced explicit "already captured and hidden" copy in the create AniSearch card while preserving the existing exact-ID duplicate redirect CTA.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add regressions for hidden duplicates and filtered-empty AniSearch feedback** - `8d16049` (test)
2. **Task 2: Wire filtered-result metadata through the create AniSearch client, controller, and card** - `f3fc887` (feat)

## Files Created/Modified
- `frontend/src/types/admin.ts` - widened the AniSearch search DTO with `filtered_existing_count`.
- `frontend/src/lib/api/admin-anime-intake.ts` - normalized AniSearch search responses so the filtered-existing count is always safe to consume.
- `frontend/src/lib/api.admin-anime.test.ts` - covered the widened AniSearch search response contract.
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - added helper-based filtered-empty feedback resolution and exposed filtered-existing state to the page/card.
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` - locked the filtered-empty message contract.
- `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` - rendered explicit hidden-duplicate guidance in the AniSearch error state.
- `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx` - verified the hidden-duplicate copy and preserved duplicate redirect CTA coverage.
- `frontend/src/app/admin/anime/create/page.tsx` - passed the filtered-existing count into the create AniSearch card.

## Decisions Made
- Defaulted `filtered_existing_count` to `0` in the typed client to keep the create controller branch-free for missing metadata.
- Kept filtered-empty searches on the existing card status surface instead of adding a new modal or conflict mode, preserving the exact-ID redirect flow untouched.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `next build` rewrote `frontend/next-env.d.ts` to a generated route import path; the file was restored and excluded so the task commit stayed scoped to Phase 16 frontend behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The create AniSearch UI now matches the backend duplicate-filter contract from 16-01.
- Phase 16 is ready for closeout/verification; exact-ID load and redirect behavior remained intact through automated tests.

## Self-Check: PASSED

- Verified `.planning/phases/16-hide-already-imported-anisearch-candidates-on-create/16-02-SUMMARY.md` exists.
- Verified task commits `8d16049` and `f3fc887` exist in git history.

---
*Phase: 16-hide-already-imported-anisearch-candidates-on-create*
*Completed: 2026-04-16*
