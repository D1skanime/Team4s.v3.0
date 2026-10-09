---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 05
subsystem: ui
tags: [react, nextjs, css-modules, media-viewer, episode-page, tdd]

# Dependency graph
requires:
  - phase: 177-04
    provides: FansubMediaLightbox (shared viewer shell), widened PublicImageLightboxItem
provides:
  - "ScreenshotGallery.tsx: real-data screenshot gallery fed by getGroupReleaseImages, opening through FansubMediaLightbox"
  - "screenshotGalleryMapping.ts: toScreenshotLightboxItem, a pure PublicReleaseImage-to-lightbox-item mapper"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-13-compliant pure mapping function (toScreenshotLightboxItem) extracted alongside the component, unit-tested without render/fireEvent, mirroring ReleaseGallery.tsx's toLightboxItem"
    - "openIndex local state pattern (ProjectMemberMediaGallery.tsx precedent) replaces the component's own lightboxOpen/activeIndex state pair"

key-files:
  created:
    - frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.ts
    - frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.test.ts
  modified:
    - frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx
    - frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.module.css
    - frontend/src/app/episodes/[id]/page.tsx
  deleted:
    - frontend/src/types/screenshotImage.ts

key-decisions:
  - "release_version_label and release_href are always set to undefined for this consumer, per the plan's explicit instruction: page.tsx has no release-version-label data source in scope, and this consumer has no CTA per the UI-SPEC Component Inventory table -- a graceful omission (D-22), not a missing feature"
  - "Dead .screenshotLightbox*/.screenshotLightboxCaption CSS rules were deleted, but .screenshotRetryButton/.screenshotThumbnail rules were kept unchanged per the plan's explicit line-range instruction even though the retry/thumbnail markup now routes through the Button primitive instead of native buttons -- the plan scoped CSS deletion narrowly to the lightbox-specific block only"

requirements-completed: [D-04]

# Metrics
duration: ~25min
completed: 2026-10-09
---

# Phase 177 Plan 05: ScreenshotGallery Migration Summary

**Migrated `ScreenshotGallery.tsx` off its permanently-broken direct `fetch()` call and hand-rolled lightbox onto `getGroupReleaseImages` + the shared `FansubMediaLightbox` from Plan 177-04 -- screenshots render real data for the first time in this architecture generation.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-09
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created, 3 modified, 1 deleted)

## Accomplishments
- `ScreenshotGallery.tsx` no longer calls `fetch(resolvePublicApiUrl(...))` against the permanently-erroring `GetByEpisodeVersionID` stub (`phase20ReleaseImportDeferred`) -- it now calls `getGroupReleaseImages(animeId, groupId, releaseVersionId, { category: 'screenshot', ... })`, the same working, already-visibility-filtered endpoint `ReleaseGallery.tsx` uses successfully (D-04)
- The component's own lightbox (raw `<img>`/`<button>`, `role="dialog"` backdrop, clamp-not-wrap Prev/Next, manual keyboard handler with Home/End) is fully deleted; images now open through `FansubMediaLightbox`, inheriting zoom, progressive load, swipe, and wrap-around Home/End navigation from Plan 177-04's shared viewer shell for free
- New `toScreenshotLightboxItem(image, episodeLabel)` pure mapping function (D-13-compliant, zero React/DOM imports) maps a screenshot-category `PublicReleaseImage` onto the widened `PublicImageLightboxItem`, with 4 unit tests covering title fallback, episode_label passthrough, and the always-undefined `release_version_label`/`release_href` fields
- Both native-button CLAUDE.md violations already present in this file (the thumbnail trigger, the retry button) are replaced with the `Button` primitive (`variant="ghost"` for thumbnails matching `ReleaseGallery.tsx`'s `imageButton` pattern, `variant="secondary"` for retry) while the file was already being rewritten
- `frontend/src/types/screenshotImage.ts` (its three exports: `ScreenshotImage`, `ScreenshotImagesResponse`, `ScreenshotGalleryProps`) is deleted outright -- confirmed via `grep -rn "screenshotImage" src` returning zero matches before deletion
- `episodes/[id]/page.tsx`'s call site now gates rendering on `hasGroupReleaseContext` (not merely `activeReleaseID !== null`), matching the pre-migration empty-state behavior, and supplies `animeId`/`groupId`/`releaseVersionId`/`episodeLabel={episode.episode_number}` to the rewritten component

## Task Commits

Each task was committed atomically, following the plan's TDD gate for the mapping function:

1. **Task 1 (RED): add failing test for toScreenshotLightboxItem mapping** - `bd8f7e0e` (test)
2. **Task 1 (GREEN): migrate ScreenshotGallery onto getGroupReleaseImages + shared viewer** - `31c3cfff` (feat)
3. **Task 2: wire the new props at the episode page call site** - `d3bf3429` (feat)

## Files Created/Modified
- `frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.ts` - new; pure `toScreenshotLightboxItem` mapper
- `frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.test.ts` - new; 4 D-13-compliant cases
- `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` - rewritten; new props (`animeId`/`groupId`/`releaseVersionId`/`episodeLabel`), `getGroupReleaseImages` data source, `openIndex` state + `FansubMediaLightbox` render, `Button` primitive for thumbnails/retry
- `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.module.css` - shrunk; `.screenshotLightbox` through `.screenshotLightboxCaption` rules deleted (owned by `MediaViewerStage`/`MediaViewerMetadataPanel` now), grid/error/retry/skeleton rules kept unchanged
- `frontend/src/app/episodes/[id]/page.tsx` - `ScreenshotGallery` call site updated: gated on `hasGroupReleaseContext`, new prop shape
- `frontend/src/types/screenshotImage.ts` - deleted; dead types once `ScreenshotGallery.tsx` moved onto `PublicReleaseImage`/`PublicImageLightboxItem`

## Decisions Made
- `release_version_label`/`release_href` are always `undefined` for this consumer -- intentional per the plan's interface spec, not a missing feature. `page.tsx` has no release-version-label data in scope on this page, and the UI-SPEC's Component Inventory table assigns no CTA to the episode-page screenshot gallery.
- CSS deletion was scoped exactly to the plan's instructed line range (the lightbox-only block); `.screenshotRetryButton`/`.screenshotThumbnail` rules were left in place even though they are now unused by the `Button`-primitive-based markup, matching the plan's explicit "keep lines 1-129" instruction rather than independently pruning newly-dead CSS.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

RED gate confirmed: `bd8f7e0e` (test commit, added a test importing a not-yet-existing module, run and verified to fail before any implementation existed).
GREEN gate confirmed: `31c3cfff` (feat commit, added the implementation, test suite re-run and verified green).

## Issues Encountered

None. Local `npx tsc`/`npx vitest`/`npx eslint` were run inside the running `team4sv30-frontend` container (Docker-only dev environment per CLAUDE.md), consistent with Plan 177-04's precedent. Full unscoped `npx vitest run` (368 test files, 3289 tests, 1 skipped) passed with zero regressions anywhere else in the frontend suite.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Screenshots on the episode detail page now render real, working data for the first time in this architecture generation, instead of silently erroring against the Phase-20 stub endpoint.
- `ScreenshotGallery` is fully migrated onto the Plan 177-04 shared viewer shell; remaining migration targets are Plan 177-06 (`ProjectMemberMediaGallery`, `ProjectMemberMediaViewer` removal) and Plan 177-07 (`GroupAssetsExperience`).
- No blockers.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED
- FOUND: frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.ts
- FOUND: frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.test.ts
- FOUND: frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx
- FOUND: frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.module.css
- FOUND: frontend/src/app/episodes/[id]/page.tsx
- CONFIRMED DELETED: frontend/src/types/screenshotImage.ts
- FOUND commit: bd8f7e0e (Task 1 RED)
- FOUND commit: 31c3cfff (Task 1 GREEN)
- FOUND commit: d3bf3429 (Task 2)
