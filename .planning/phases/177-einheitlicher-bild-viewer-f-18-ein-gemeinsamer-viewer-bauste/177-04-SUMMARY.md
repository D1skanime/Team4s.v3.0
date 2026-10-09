---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 04
subsystem: ui
tags: [react, nextjs, css-modules, media-viewer, zoom, swipe, progressive-load, tdd]

# Dependency graph
requires:
  - phase: 177-01
    provides: wrapIndex, computeSwipeNavigation, nextZoomState, selectDisplaySrc (pure navigation logic)
  - phase: 177-02
    provides: Modal variant="stage", Button variant="floating", --surface-stage token
provides:
  - "FansubMediaLightbox.tsx: the extended shared viewer shell (widened PublicImageLightboxItem, Modal variant='stage', wrapIndex-based nav incl. Home/End)"
  - "MediaViewerStage.tsx: zoom/progressive-load/prefetch/swipe image stage + exported shouldShowLoadingPill"
  - "MediaViewerMetadataPanel.tsx: stacked, graceful-omission metadata panel"
  - "mediaViewerMetadata.ts: resolveCategoryLabel, resolveCaption (D-07 fallback chains)"
affects: ["177-05 (ScreenshotGallery migration)", "177-06 (ProjectMemberMediaGallery migration, ProjectMemberMediaViewer removal)", "177-07 (GroupAssetsExperience migration)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-13-compliant extraction: the one piece of unique, non-already-pure logic in a new component (shouldShowLoadingPill, resolveCategoryLabel/resolveCaption) is exported as a standalone function with a dedicated describe/it/expect test, zero render/fireEvent"
    - "Native <img> deliberately chosen over next/image for zoom-to-native-resolution (documented inline as a one-line deviation comment per the plan's instruction)"
    - "Title-vs-category-chip dedup in the metadata panel mirrors the pre-existing caption-vs-category dedup already present in ReleaseGallery.tsx's toLightboxItem, extended to the new render layer"

key-files:
  created:
    - frontend/src/components/fansubs/MediaViewerStage.tsx
    - frontend/src/components/fansubs/MediaViewerStage.module.css
    - frontend/src/components/fansubs/MediaViewerStage.test.ts
    - frontend/src/components/fansubs/MediaViewerMetadataPanel.tsx
    - frontend/src/components/fansubs/MediaViewerMetadataPanel.module.css
    - frontend/src/lib/mediaViewerMetadata.ts
    - frontend/src/lib/mediaViewerMetadata.test.ts
  modified:
    - frontend/src/components/fansubs/FansubMediaLightbox.tsx
    - frontend/src/components/fansubs/FansubMediaLightbox.module.css
    - frontend/src/components/fansubs/FansubMediaLightbox.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
    - frontend/src/components/fansubs/__tests__/FansubMediaLightbox.test.tsx

key-decisions:
  - "MediaViewerStage owns the Prev/Next floating buttons and the n/N counter (moved out of FansubMediaLightbox per the plan's Task 3 action), requiring additional index/total/onPrevious/onNext props beyond Task 1's minimal prop list -- these were added during Task 1 so Task 3 (which does not touch MediaViewerStage.tsx per its own file list) could wire against a complete contract"
  - "Title row in MediaViewerMetadataPanel is suppressed when identical to the resolved category label, to avoid showing the same text twice in the visible panel (title h3 + category badge) -- mirrors the project's existing caption-vs-category dedup convention in ReleaseGallery.tsx's toLightboxItem"

patterns-established:
  - "Pure fallback-resolution functions (resolveCategoryLabel, resolveCaption) live in frontend/src/lib/, tested without @testing-library/react, following the mediaViewerNavigation.ts precedent from Plan 177-01"

requirements-completed: [D-01, D-02, D-03, D-07, D-12, D-13, D-15, D-19, D-21, D-22, D-23]

# Metrics
duration: ~20min
completed: 2026-10-09
---

# Phase 177 Plan 04: Unified Viewer Shell Summary

**Extended `FansubMediaLightbox.tsx` in place into the shared viewer shell — Modal's dark `stage` chrome, click-to-zoom, touch-swipe, progressive-load with a graceful loading pill, neighbor prefetch, Home/End navigation, and a stacked graceful-omission metadata panel — while `ReleaseGallery.tsx` and `FansubGroupMediaBlock.tsx` keep compiling with zero edits.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-09
- **Tasks:** 3 completed
- **Files modified:** 12 (7 created, 5 modified)

## Accomplishments
- `PublicImageLightboxItem` widened with six additive optional fields (`display_url`, `thumbnail_url`, `category`, `episode_label`, `release_version_label`, `release_href`) — `ReleaseGallery.tsx`'s `toLightboxItem` and `FansubGroupMediaBlock.tsx`'s direct pass-through both keep compiling unmodified (D-07)
- `MediaViewerStage.tsx`: click/tap-to-zoom (binary toggle via `nextZoomState`), progressive display→original image swap with a "Originalbild wird geladen …" pill (`shouldShowLoadingPill`, exported + unit-tested), touch-swipe navigation (`computeSwipeNavigation`), neighbor prefetch ported verbatim from `ProjectMemberMediaViewer` parameterized on `original_url`, and a hard-load-error fallback via the existing `ErrorState` primitive
- `MediaViewerMetadataPanel.tsx` + `mediaViewerMetadata.ts`: stacked, graceful-omission metadata panel (D-21/D-22) with two dedicated D-13-compliant pure fallback functions — `resolveCategoryLabel` (category→media_type) and `resolveCaption` (caption→description), each with 4 unit test cases
- `FansubMediaLightbox.tsx` now renders `Modal variant="stage"` containing `MediaViewerStage` + `MediaViewerMetadataPanel` stacked vertically; all navigation (keyboard ArrowLeft/ArrowRight/Home/End, Prev/Next buttons, swipe) routed through `wrapIndex` from Plan 177-01, including the new Home/End baseline (D-23)
- Rewrote `FansubMediaLightbox.test.tsx` with zero `fireEvent` calls, per D-13

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen PublicImageLightboxItem + build MediaViewerStage.tsx** - `58eeb7f9` (feat)
2. **Task 2: Build MediaViewerMetadataPanel.tsx** - `64b5d01b` (feat)
3. **Task 3: Wire the shell (Modal stage variant + wrapIndex keyboard/Home/End + Stage + Panel) and rewrite the test** - `2cf4a1e1` (feat)

## Files Created/Modified
- `frontend/src/components/fansubs/MediaViewerStage.tsx` - new; zoom/progressive-load/prefetch/swipe image stage, exports `shouldShowLoadingPill`
- `frontend/src/components/fansubs/MediaViewerStage.module.css` - new; dark stage styling, zoom cursor states, floating-button/counter/pill positioning
- `frontend/src/components/fansubs/MediaViewerStage.test.ts` - new; 4 D-13-compliant cases for `shouldShowLoadingPill`
- `frontend/src/components/fansubs/MediaViewerMetadataPanel.tsx` - new; stacked metadata panel, graceful omission, Badge-based category chip
- `frontend/src/components/fansubs/MediaViewerMetadataPanel.module.css` - new; single-column grid layout, no media queries (D-21)
- `frontend/src/lib/mediaViewerMetadata.ts` - new; `resolveCategoryLabel`, `resolveCaption` pure functions
- `frontend/src/lib/mediaViewerMetadata.test.ts` - new; 8 D-13-compliant cases
- `frontend/src/components/fansubs/FansubMediaLightbox.tsx` - extended; widened interface, Modal `variant="stage"`, wrapIndex/Home/End nav, renders Stage+Panel
- `frontend/src/components/fansubs/FansubMediaLightbox.module.css` - shrunk to pure stacking (`.lightboxBody` only); image/description/nav/counter rules moved to `MediaViewerStage.module.css`
- `frontend/src/components/fansubs/FansubMediaLightbox.test.tsx` - rewritten; zero `fireEvent`, render-only inspection
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx` - 2 assertions updated (1→2 occurrences) to account for Modal stage variant's screenreader-only title span (see Deviations)
- `frontend/src/components/fansubs/__tests__/FansubMediaLightbox.test.tsx` - fixed a stale fixture default (`caption` no longer shadows `description`) to match the new D-07 caption→description fallback priority

## Decisions Made
- `MediaViewerStage` was given `index`/`total`/`onPrevious`/`onNext` props in Task 1 (beyond Task 1's minimal listed prop set) because Task 3's action explicitly requires the Prev/Next buttons and the `n / N` counter to live inside `MediaViewerStage`, but `MediaViewerStage.tsx` is not in Task 3's own `<files>` list — so the complete prop contract had to exist before Task 3 began.
- The metadata panel's title row is suppressed when it textually equals the resolved category label, to avoid a genuine visible duplication (title h3 + category badge showing identical text) for consumers like `ReleaseGallery` whose `toLightboxItem` falls back to the category label when no explicit per-image title exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Metadata panel title/category-badge duplication for category-label-only items**
- **Found during:** Task 3, full-suite regression run
- **Issue:** When an item has no distinct title (common for `ReleaseGallery`'s D-07 fallback path, where `toLightboxItem` sets `title` to the category label itself), the new panel rendered the category label three times total within the dialog: Modal's screenreader-only `aria-labelledby` span (new in `variant="stage"`), the panel's `<h3>` title, and the category `Badge`. A pre-existing regression test (`ReleaseGallery.test.tsx` — "does not repeat a caption that is identical to the category title in the lightbox") caught this.
- **Fix:** `MediaViewerMetadataPanel.tsx` now suppresses its own `<h3>` title row when it is textually identical to the resolved category label, keeping the category `Badge` as the single visible representation (per UI-SPEC's stated preference that the category chip should essentially always render). Updated the two affected `ReleaseGallery.test.tsx` assertions from an expected count of 1 to 2, since Modal's new stage-variant accessibility span is an intentional, unavoidable second (hidden) occurrence that did not exist under the old default Modal variant.
- **Files modified:** `frontend/src/components/fansubs/MediaViewerMetadataPanel.tsx`, `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx`
- **Commit:** `2cf4a1e1`

**2. [Rule 1 - Bug] Stale fixture default broke a legacy integration test**
- **Found during:** Task 3, full-suite regression run
- **Issue:** `frontend/src/components/fansubs/__tests__/FansubMediaLightbox.test.tsx` (a pre-existing test file not referenced anywhere in 177-RESEARCH.md/177-PATTERNS.md, covering `FansubGroupMediaBlock` + `FansubMediaLightbox` integration) had a fixture default of `caption: 'visible_group_media'` on every row. Under the old component, `caption` was never rendered (only `description` was) — only used for the title fallback chain. Under the new `resolveCaption` fallback (caption wins over description when both are present, per D-07), the fixture's sentinel caption value started shadowing the per-test `description` override the test actually wanted to assert on.
- **Fix:** Changed the fixture's default `caption` to `null`, letting per-test `description` overrides flow through `resolveCaption`'s fallback as originally intended.
- **Files modified:** `frontend/src/components/fansubs/__tests__/FansubMediaLightbox.test.tsx`
- **Commit:** `2cf4a1e1`

**3. [Rule 1 - Bug] ESLint `react-hooks/set-state-in-effect` on the item-change reset effect**
- **Found during:** Task 1, eslint check
- **Issue:** The effect that resets `zoomed`/`originalLoaded`/`hasError` to `false` whenever `item.id` changes triggered the project's `react-hooks/set-state-in-effect` rule.
- **Fix:** Applied the same `// eslint-disable-next-line react-hooks/set-state-in-effect` pattern already established elsewhere in the codebase (e.g. `GroupMediaReviewSection.tsx`) for this exact "reset derived UI state when a prop/id changes" case.
- **Files modified:** `frontend/src/components/fansubs/MediaViewerStage.tsx`
- **Commit:** `58eeb7f9`

None of these changes touched `ReleaseGallery.tsx` or `FansubGroupMediaBlock.tsx` themselves (D-07 compatibility guarantee verified via `git diff --stat`, zero changes).

## Issues Encountered
- Local `npx tsc`/`npx vitest`/`npx eslint` outside the Docker container fail to resolve dependencies (no host-side `node_modules`, Docker-only dev environment per CLAUDE.md). All verification commands were run inside the running `team4sv30-frontend` container instead, consistent with the project's canonical workflow.
- A full, unscoped `npx vitest run` inside the container (367 test files, 3285 tests) was run twice as an extra safety net beyond the plan's own scoped verification command, to confirm this plan's changes caused zero regressions anywhere else in the frontend test suite. Both runs passed cleanly after the Rule-1 fixes above (first run surfaced the 2 pre-existing test failures now fixed; second run, 367/367 passed).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- `FansubMediaLightbox` is the unified viewer shell, ready to be adopted by Plans 177-05 (`ScreenshotGallery`), 177-06 (`ProjectMemberMediaGallery`, which also removes `ProjectMemberMediaViewer.tsx` now that its prefetch/sidebar logic has been ported), and 177-07 (`GroupAssetsExperience`).
- `MediaViewerStage`'s prop contract (`item`, `title`, `index`, `total`, `prevOriginalUrl`, `nextOriginalUrl`, `onSwipeNavigate`, `onPrevious`, `onNext`) and `MediaViewerMetadataPanel`'s single `item` prop are both stable and ready for those plans to map their own data shapes onto the widened `PublicImageLightboxItem` additive fields.
- No blockers. `ReleaseGallery.tsx` and `FansubGroupMediaBlock.tsx` verified unmodified (`git diff --stat` zero changes) and still render correctly through the new shell.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED
- FOUND: frontend/src/components/fansubs/MediaViewerStage.tsx
- FOUND: frontend/src/components/fansubs/MediaViewerStage.module.css
- FOUND: frontend/src/components/fansubs/MediaViewerStage.test.ts
- FOUND: frontend/src/components/fansubs/MediaViewerMetadataPanel.tsx
- FOUND: frontend/src/components/fansubs/MediaViewerMetadataPanel.module.css
- FOUND: frontend/src/lib/mediaViewerMetadata.ts
- FOUND: frontend/src/lib/mediaViewerMetadata.test.ts
- FOUND: frontend/src/components/fansubs/FansubMediaLightbox.tsx
- FOUND: frontend/src/components/fansubs/FansubMediaLightbox.module.css
- FOUND: frontend/src/components/fansubs/FansubMediaLightbox.test.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
- FOUND: frontend/src/components/fansubs/__tests__/FansubMediaLightbox.test.tsx
- FOUND commit: 58eeb7f9 (Task 1)
- FOUND commit: 64b5d01b (Task 2)
- FOUND commit: 2cf4a1e1 (Task 3)
