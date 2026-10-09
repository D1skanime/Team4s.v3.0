---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 07
subsystem: ui
tags: [react, nextjs, css-modules, media-viewer, jellyfin]

# Dependency graph
requires:
  - phase: 177-04
    provides: "FansubMediaLightbox.tsx (shared viewer shell), widened PublicImageLightboxItem contract"
provides:
  - "groupAssetMediaMapping.ts: pure GroupAssetImage -> PublicImageLightboxItem mapping (toGroupAssetLightboxItem), directly testable per D-13"
  - "GroupAssetsExperience.tsx's image lightbox migrated onto the shared FansubMediaLightbox, with wrap-around navigation superseding the old clamp behavior"
affects: ["177-08 (Live-UAT checkpoint across all five migrated consumers, including the wrap-around behavior change flagged here)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-episode local open-state ({ images, index } | null) used instead of a single flat media array, because this consumer's images are scoped per-episode rather than one global list -- the shared viewer still receives a complete, already-filtered array for correct wrap-around totals"
    - "D-13-compliant pure mapping function (toGroupAssetLightboxItem) with its own unit test file, following the projectMemberMediaMapping.ts/.test.ts precedent from Plan 177-06"

key-files:
  created:
    - frontend/src/components/groups/groupAssetMediaMapping.ts
    - frontend/src/components/groups/groupAssetMediaMapping.test.ts
  modified:
    - frontend/src/components/groups/GroupAssetsExperience.tsx
    - frontend/src/components/groups/GroupAssetsExperience.module.css

key-decisions:
  - "toGroupAssetLightboxItem uses the array index (not GroupAssetImage.id, which is a string) as the synthetic numeric id, since this consumer always navigates the full per-episode array and never does ID-based lookup"
  - "media_type is set to image.title (the only label-like text this data shape has) purely as the Modal's accessible-title fallback input, never surfaced as a separate category value -- all other D-19 metadata fields (caption, description, display_url, category, episode_label, release_version_label, release_href) are structurally undefined, per D-20/D-22"

patterns-established: []

requirements-completed: [D-05, D-18, D-20]

# Metrics
duration: ~15min
completed: 2026-10-09
---

# Phase 177 Plan 07: GroupAssetsExperience Migration Summary

**GroupAssetsExperience's image lightbox (clamp-not-wrap, raw-markup `role="dialog"`) is replaced by the shared `FansubMediaLightbox`, now with wrap-around navigation, via a new pure `toGroupAssetLightboxItem` mapping function; its video path (`VideoPlayerModal`/`openVideo`/`playingAsset`) is byte-identical to before.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-10-09
- **Tasks:** 1 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `groupAssetMediaMapping.ts`: new pure `toGroupAssetLightboxItem(image, index)` mapping `GroupAssetImage` -> the shared viewer's `PublicImageLightboxItem`, with 3 D-13-compliant unit tests covering graceful field omission, the synthetic index-based id, and the `image_url`/`thumbnail_url` passthrough
- `GroupAssetsExperience.tsx`: removed `lightboxImages`/`activeImageIndex` state, the clamp-not-wrap keyboard `useEffect`, `openGallery`, and the raw `<img>`/`<button>`/`role="dialog"` lightbox render block; replaced with a local `openGallery: { images, index } | null` state feeding `FansubMediaLightbox`
- `GroupAssetsExperience.module.css`: removed the now-dead `.lightbox`/`.lightboxContent`/`.lightboxImage`/`.closeButton`/`.navButton*`/`.lightboxMeta` rules and their mobile media-query overrides
- Video path (`playingAsset`/`isPlayerOpen`/`openVideo`/`toPlayableAsset`/`.mediaGrid` render/`VideoPlayerModal`) confirmed byte-identical via grep and read-through diff — zero lines touched

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the mapping function and surgically replace the image lightbox with the shared viewer** - `13a42b06` (feat)

## Files Created/Modified
- `frontend/src/components/groups/groupAssetMediaMapping.ts` - new; pure `toGroupAssetLightboxItem` mapping function, zero React/DOM imports
- `frontend/src/components/groups/groupAssetMediaMapping.test.ts` - new; 3 unit test cases (graceful omission, synthetic id, URL passthrough)
- `frontend/src/components/groups/GroupAssetsExperience.tsx` - image lightbox state/handlers/render replaced by `FansubMediaLightbox`; video path untouched
- `frontend/src/components/groups/GroupAssetsExperience.module.css` - dead lightbox-only CSS rules removed; grid/video-path rules untouched

## Decisions Made
- Used the array index as the lightbox item's synthetic numeric `id` rather than attempting to coerce `GroupAssetImage.id` (a string) — matches the plan's explicit interface note and the established `toGroupAssetLightboxItem`/`toProjectMemberLightboxItem` precedent of never faking an ID that doesn't exist in the source data.
- Kept per-episode `{ images, index }` local open-state (rather than flattening all episodes into one array) since the plan's behavior spec and the component's existing per-episode grid structure both require wrap-around to operate within a single episode's image set, not across the whole page.

## Deviations from Plan

None - plan executed exactly as written. One potential URL-resolution concern was investigated and confirmed to be a non-issue: `MediaViewerStage.tsx` (Plan 177-04 output) already calls `resolveApiUrl` from `@/lib/api` internally on `original_url`/`thumbnail_url` (which recognizes `/api/`-prefixed relative paths, the exact shape `buildGroupMediaImageURL` in the backend produces), so the mapping function correctly passes `image.image_url`/`image.thumbnail_url` through unresolved, exactly as the plan's `<behavior>` spec states, without needing a local pre-resolution step.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All five `177-RESEARCH.md`-identified consumers of a bespoke image lightbox (ReleaseGallery via 177-04 compatibility, ScreenshotGallery via 177-05, ProjectMemberMediaGallery via 177-06, and now GroupAssetsExperience via this plan) are unified on `FansubMediaLightbox`.
- The clamp-to-wrap-around navigation change for this consumer is flagged for the Plan 177-08 Live-UAT checkpoint, per the plan's interface note.
- No blockers. Full frontend suite green (369/370 test files, 1 pre-existing unrelated skip; 3292/3295 tests, 3 pre-existing unrelated todos) after this change, confirming zero regressions anywhere else in the frontend.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED
- FOUND: frontend/src/components/groups/groupAssetMediaMapping.ts
- FOUND: frontend/src/components/groups/groupAssetMediaMapping.test.ts
- FOUND: frontend/src/components/groups/GroupAssetsExperience.tsx
- FOUND: frontend/src/components/groups/GroupAssetsExperience.module.css
- FOUND commit: 13a42b06 (Task 1)
