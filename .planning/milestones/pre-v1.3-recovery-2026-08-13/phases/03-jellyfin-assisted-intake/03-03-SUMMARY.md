---
phase: 03-jellyfin-assisted-intake
plan: 03
subsystem: create-flow
tags: [react, nextjs, vitest, jellyfin, admin-intake]
requires:
  - phase: 03-02
    provides: intake candidate review and preview primitives
provides:
  - shared create draft hydration from Jellyfin preview
  - advisory type reasoning in the draft
  - draft-level Jellyfin asset review and removal
affects: [phase-03-04, admin-anime-create, jellyfin-intake]
tech-stack:
  added: []
  patterns: [same-route hydration, draft-only asset removal, explicit placeholder source controls]
key-files:
  created:
    - frontend/src/app/admin/anime/components/ManualCreate/JellyfinDraftAssets.tsx
    - frontend/src/app/admin/anime/components/ManualCreate/JellyfinDraftAssets.test.tsx
    - frontend/src/app/admin/anime/utils/jellyfin-intake-type-hint.ts
    - frontend/src/app/admin/anime/utils/jellyfin-intake-type-hint.test.ts
  modified:
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/page.test.tsx
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx
    - frontend/src/app/admin/anime/components/CreatePage/AnimeCreateCoverField.tsx
    - frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts
key-decisions:
  - "Jellyfin hydration stays inside the existing /admin/anime/create route and never opens a second wizard."
  - "Imported Jellyfin media can be removed only after draft hydration, never from the candidate cards."
  - "AniSearch remains visible as a placeholder control in Phase 3 and does not mutate draft data yet."
requirements-completed: [INTK-03, JFIN-04, JFIN-05, JFIN-06]
duration: 23 min
completed: 2026-03-25
---

# Phase 03 Plan 03: Shared Draft Hydration Summary

**The shared manual create route now hydrates directly from Jellyfin preview data, keeps the save bar as the only persistence point, and lets admins remove imported media from the unsaved draft.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-03-25T14:21:00+01:00
- **Completed:** 2026-03-25T14:44:45+01:00
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added title-adjacent `Jellyfin Sync` and `AniSearch Sync` controls with meaningful-title gating and placeholder Phase-4 copy for AniSearch.
- Wired Jellyfin candidate review into the same `/admin/anime/create` draft so selecting a candidate immediately pre-fills the shared editor without persisting anything.
- Added draft-level Jellyfin asset review for cover, logo, banner, background, and background-video, including explicit empty-slot copy and `Aus Entwurf entfernen`.
- Added advisory type-hint formatting and restore-on-discard behavior so admins can throw away a Jellyfin preview without creating an anime.

## Verification

- `npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/components/ManualCreate/JellyfinDraftAssets.test.tsx src/app/admin/anime/utils/jellyfin-intake-type-hint.test.ts`
- `npm run build`

## Next Phase Readiness

- Phase `03-04` can now carry the selected Jellyfin linkage into the explicit create payload without changing the preview-only behavior before save.

