---
phase: 07-generic-upload-and-linking
plan: 02
subsystem: ui
tags: [react, nextjs, typescript, vitest, admin-upload, anime-assets]
requires:
  - phase: 07-generic-upload-and-linking
    provides: backend logo and background_video asset-linking routes plus the verified anime-first V2 upload seam
provides:
  - typed frontend upload helpers for poster, banner, logo, background, and background_video
  - generic edit-route upload and link mutations keyed by asset kind
  - create and edit copy aligned with the verified V2 upload seam
affects: [phase-08-lifecycle-cleanup, admin-anime-edit, admin-anime-create]
tech-stack:
  added: []
  patterns: [asset-kind config for anime upload-plus-link mutations, shared singular asset helper routing in frontend api]
key-files:
  created: []
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/api.admin-anime.test.ts
    - frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts
    - frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts
    - frontend/src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx
    - frontend/src/app/admin/anime/create/page.test.tsx
    - frontend/src/app/admin/anime/[id]/edit/page.test.tsx
key-decisions:
  - "Frontend asset uploads now route through an asset-kind config so singular slots and additive backgrounds share one mutation seam without slot-specific helpers."
  - "The client mirrors backend slot names directly for logo and background_video, while cover continues to map to the upload seam's poster alias."
patterns-established:
  - "Use shared assign/delete helpers in frontend api.ts for singular anime asset slots."
  - "Keep operator-facing upload copy tied to the verified V2 seam, never to frontend/public/covers."
requirements-completed: [UPLD-01, UPLD-02, UPLD-03]
duration: 4 min
completed: 2026-04-04
---

# Phase 07 Plan 02: Generic Upload And Linking Summary

**Typed anime asset uploads for logo and background_video, plus a generic edit mutation seam that keeps background linking additive through the verified V2 flow**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T21:20:00Z
- **Completed:** 2026-04-04T21:23:42Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Expanded the frontend upload contract to the full Phase 7 asset vocabulary and added typed logo/background_video link helpers.
- Replaced the edit route's cover-only upload path with an asset-kind-driven mutation seam while preserving additive background behavior.
- Removed legacy `frontend/public/covers` wording from create/edit guidance and pinned the V2 seam in targeted tests.

## Task Commits

1. **Task 1: Add failing frontend coverage for the full Phase 7 asset set and generic upload/link mutations** - `12c442f` (test)
2. **Task 2: Implement generic client asset helpers and update create/edit flows to match the V2 seam** - `f8293ac` (feat)

## Files Created/Modified

- `frontend/src/types/admin.ts` - Added shared anime asset kind/upload unions and expanded persisted asset typing.
- `frontend/src/lib/api.ts` - Added singular asset helper routing, structured XHR upload error parsing, and typed logo/background_video helpers.
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts` - Switched edit uploads to an asset-kind config with shared upload-plus-link behavior.
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx` - Updated edit copy to the verified V2 seam and removed debug logging.
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - Updated create-route operator copy to reference the verified V2 seam.
- `frontend/src/lib/api.admin-anime.test.ts` - Added client coverage for full asset vocabulary and structured errors on new link helpers.
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts` - Added generic mutation coverage for logo and additive background uploads.
- `frontend/src/app/admin/anime/create/page.test.tsx` - Asserted create copy references the V2 upload seam.
- `frontend/src/app/admin/anime/[id]/edit/page.test.tsx` - Asserted edit asset UI no longer references the legacy covers path.

## Decisions Made

- Used one config table in the edit hook to map each asset kind to its upload alias, link helper, and operator-facing failure copy.
- Kept `background` as the only additive asset path while treating `cover`, `banner`, `logo`, and `background_video` as singular replacement slots.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The new upload helper test initially depended on `ProgressEvent`, which is not present in the Vitest runtime. The test harness was adjusted to trigger `XMLHttpRequest.onload` without changing production behavior.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts:159` still carries `TODO: Re-enable auth check before production`; this pre-existing guard remains outside the scope of Phase 07-02.

## Next Phase Readiness

- Frontend create and edit flows now speak the same generic V2 upload seam for the supported anime asset slots.
- Manual browser verification for banner/logo upload on the local admin UI is still pending.

## Self-Check: PASSED

- Found `.planning/phases/07-generic-upload-and-linking/07-02-SUMMARY.md`
- Found commit `12c442f`
- Found commit `f8293ac`

---
*Phase: 07-generic-upload-and-linking*
*Completed: 2026-04-04*
