---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 14
subsystem: ui
tags: [zoom, pan, gesture, viewer, react-hook, d-37, d-38, d-39]

# Dependency graph
requires:
  - phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
    provides: |
      Plan 177-12's restyled viewer chrome (veil background, centered axis,
      Display-role title, dark NavArrow) and Plan 177-13's pure D-37 zoom/pan
      math + 3-way resolveEscapeTarget
provides:
  - "useMediaViewerZoomPan: feature-local React hook owning pan state and all double-click/wheel/mouse-drag/touch-drag/pinch gesture wiring, delegating every decision to mediaViewerZoom.ts"
  - "MediaViewerStage.tsx as a thin consumer of the hook, with zoom/pan rendered via a single inline CSS transform and zero internal binary zoom state"
  - "FansubMediaLightbox.tsx owning lifted zoomLevel state, the 3-stage Escape wiring, and the D-38 top-bar magnifier Button"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "zoomLevel-echo ref: a hook-owned gesture (wheel/pinch/double-click) calls the lifted onZoomLevelChange callback AND records the level it just requested into a ref, synchronously, so a same-render echo of that prop change can be distinguished from an externally-driven one (button/Escape/navigate) without clobbering a carefully computed pan with {0,0}"
    - "Native, non-passive wheel/touchmove listeners (addEventListener, not onWheel/onTouchMove React props) re-attached on dependency change, matching the established FocalCarouselInternals.tsx precedent, so preventDefault() reliably suppresses page scroll/navigation while zoomed"

key-files:
  created:
    - frontend/src/components/fansubs/useMediaViewerZoomPan.ts
  modified:
    - frontend/src/components/fansubs/MediaViewerStage.tsx
    - frontend/src/components/fansubs/MediaViewerStage.module.css
    - frontend/src/lib/mediaViewerNavigation.ts
    - frontend/src/lib/mediaViewerNavigation.test.ts
    - frontend/src/lib/mediaViewerZoom.ts
    - frontend/src/components/fansubs/FansubMediaLightbox.tsx
    - frontend/src/components/fansubs/FansubMediaLightbox.module.css

key-decisions:
  - "D-37: fit->2x->4x->fit double-click/button cycle, clamped mouse/touch drag-pan, continuous pinch zoom, cursor-anchored wheel-zoom, 3-stage Escape (zoom->panel->viewer), unconditional reset-on-navigate -- all wired end-to-end via the new hook"
  - "D-38: the magnifier trigger moved from MediaViewerStage's on-stage floating Button into FansubMediaLightbox's top bar, next to Modal's close-X, with the exact aria-label pair 'Bild vergrößern' / 'Zoom zurücksetzen'"
  - "D-39: all five consumer surfaces inherit this unchanged, since none of them were edited -- they all delegate to FansubMediaLightbox"

patterns-established:
  - "Lifted interaction state (zoomLevel) mirrors the existing captionPanelOpen lift: owned by the shared shell, not the leaf stage component, whenever a leaf-local gesture hook, a top-bar button, AND Modal's Escape handling all need to read/write the same value"

requirements-completed: [D-37, D-38, D-39]

# Metrics
duration: 38min
completed: 2026-10-09
---

# Phase 177 Plan 14: Real Multi-Level Zoom/Pan Viewer Shell Wiring Summary

**A new `useMediaViewerZoomPan` hook wires Plan 177-13's pure D-37 math into actual double-click/wheel/mouse-drag/touch-drag/pinch gestures, replacing the binary fit/100% zoom toggle both prior Live-UAT rounds rejected with a real fit->2x->4x cycle, clamped pan, cursor-anchored wheel-zoom, and a relocated top-bar magnifier button (D-38).**

## Performance

- **Duration:** 38 min
- **Started:** 2026-10-09T17:40:00Z (approx., based on first file read)
- **Completed:** 2026-10-09T18:00:00Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- Built `useMediaViewerZoomPan`, a feature-local hook owning `pan` state and every gesture handler (double-click cycle, mouse-drag pan, touch-drag pan, continuous pinch, cursor-anchored wheel-zoom), delegating all arithmetic to Plan 177-13's pure `mediaViewerZoom.ts` functions
- Implemented the zoomLevel-echo ref mechanism that distinguishes a gesture-authored zoom change (which carries its own correctly computed pan) from an externally-driven one (button/Escape/navigate, which resets pan to zero) without a visible jump/flicker
- Rewired `MediaViewerStage.tsx` onto the hook: removed the internal binary `zoomed` state, the on-stage floating zoom `Button`, and `handleTouchStart`/`handleTouchEnd`/the wheel effect (all now live in the hook); the image renders zoom/pan via a single inline `transform: translate(...) scale(...)` instead of swapping CSS classes
- Deleted `nextZoomState` from `mediaViewerNavigation.ts`/its test, and the one remaining doc-comment reference to it in `mediaViewerZoom.ts`, leaving zero references anywhere in the codebase
- Lifted `zoomLevel` into `FansubMediaLightbox.tsx` (mirroring `captionPanelOpen`), extended the item-change reset effect, rewired Modal's `onEscapeKeyDown` to the 3-way `resolveEscapeTarget(isZoomed(zoomLevel), captionPanelOpen)`, and moved the magnifier trigger into the top bar next to the close-X with the exact D-38 aria-label pair
- Zero edits to any of the five pre-existing consumer call sites (`ReleaseGallery.tsx`, `FansubGroupMediaBlock.tsx`, `ScreenshotGallery.tsx`, `ProjectMemberMediaGallery.tsx`, `GroupAssetsExperience.tsx`) or any of their regression test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the useMediaViewerZoomPan hook** - `92e96c1f` (feat)
2. **Task 2: Rewire MediaViewerStage.tsx onto the hook; remove the binary zoom toggle and nextZoomState** - `7ea3b5ed` (fix)
3. **Task 3: Lift zoomLevel into FansubMediaLightbox.tsx; wire the 3-stage Escape; move the magnifier button (D-38)** - `81b2b9a0` (feat)

A fourth, small doc-only follow-up commit corrected a stale comment discovered during final verification:

4. **Doc fix: FansubMediaLightbox's module comment still described the superseded 2-stage Escape sequence** - `2795f85f` (docs)

**Plan metadata:** (pending — final commit below)

## Files Created/Modified
- `frontend/src/components/fansubs/useMediaViewerZoomPan.ts` - New hook: refs (`containerRef`/`imageRef`/`lastSyncedZoomLevelRef`/`pinchRef`/`dragRef`/`touchGestureRef`/`touchStartRef`), `pan` state, two reset effects (echo-ref comparison + unconditional `resetKey`), native wheel/touchmove listener effects, and the four returned event callbacks
- `frontend/src/components/fansubs/MediaViewerStage.tsx` - Thin consumer of the hook; dropped `ZoomIn`/`ZoomOut`/`Button` imports, `nextZoomState` import, local `zoomed` state, `toggleZoom`, `handleTouchStart`/`handleTouchEnd`, the wheel effect, `SWIPE_THRESHOLD`/`WHEEL_THROTTLE_MS`; added `zoomLevel`/`onZoomLevelChange` props and the inline transform-driven `<img>` style
- `frontend/src/components/fansubs/MediaViewerStage.module.css` - Deleted `.stageImageZoomed` (superseded by the inline transform) and `.zoomButton` (moved to `FansubMediaLightbox.module.css`); removed the static `cursor: zoom-in` from `.stageImage` (now set dynamically)
- `frontend/src/lib/mediaViewerNavigation.ts` - Deleted `nextZoomState` and its doc comment (D-37 fully supersedes D-03's binary toggle)
- `frontend/src/lib/mediaViewerNavigation.test.ts` - Deleted the `nextZoomState` describe block and its import
- `frontend/src/lib/mediaViewerZoom.ts` - Updated one doc-comment reference that still named `nextZoomState` by identifier, to keep the "zero references anywhere" grep gate honest
- `frontend/src/components/fansubs/FansubMediaLightbox.tsx` - Added lifted `zoomLevel` state + reset wiring, the 3-way `onEscapeKeyDown`, the top-bar magnifier `Button`, and the two new `MediaViewerStage` props; corrected the module doc comment's Escape-sequence description
- `frontend/src/components/fansubs/FansubMediaLightbox.module.css` - Added `.zoomButton` positioned immediately left of Modal's `.closeButtonFloating` (`calc(var(--space-5) + 40px + var(--space-2))` from the right edge)

## Decisions Made
- Used `MutableRefObject<T | null>` (not an explicit `RefObject<T | null>` interface annotation) for the hook's returned `containerRef`/`imageRef` types, matching what `useRef<T | null>(null)` actually returns at runtime — an explicit `RefObject<T | null>` annotation caused a real TS2322 error when spread onto `ref={containerRef}`/`ref={imageRef}` in `MediaViewerStage.tsx` (JSX's `LegacyRef<T>` requires `RefObject<T>`, and TS does not treat `RefObject<T | null>` as assignable to it even though the resolved `current` field type is textually identical) — fixed inline (Rule 1) rather than deviating from the plan's stated return shape
- Wired `resolveStageSwipeAction(zoomed)` into the touch-start pan-vs-swipe decision (rather than leaving the inlined `if (zoomed)` check the plan's prose literally describes) so the imported function is actually consumed, avoiding an unused-import lint warning while staying semantically identical to the plan's intent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `RefObject<T | null>` return-type annotation caused a real TS2322 error at the `ref={...}` JSX call sites**
- **Found during:** Task 1 (surfaced once Task 2 consumed the hook's return value)
- **Issue:** The plan's interface sketch used `RefObject<T | null>`; TypeScript's JSX `ref` prop type (`LegacyRef<T>` → `RefObject<T>`) does not accept that annotation even though the underlying runtime object and its `current` field type are identical to what `useRef` already returns elsewhere in this exact codebase pattern (`useWindowedEpisodePages.ts`, the original `MediaViewerStage.tsx`'s own `stageRef`)
- **Fix:** Changed the hook's returned ref types to `MutableRefObject<HTMLDivElement | null>` / `MutableRefObject<HTMLImageElement | null>`, imported from `'react'`
- **Files modified:** `frontend/src/components/fansubs/useMediaViewerZoomPan.ts`
- **Commit:** `92e96c1f` (fixed within the same task, before its own commit — no separate commit needed)

**2. [Rule 1 - Bug/lint] Stale `nextZoomState` identifier survived in a `mediaViewerZoom.ts` doc comment**
- **Found during:** Task 2's own acceptance-criteria grep (`grep -rn "nextZoomState" frontend/src` must return zero matches)
- **Issue:** Plan 177-13's doc comment at the top of `mediaViewerZoom.ts` referenced the then-still-alive `nextZoomState` by name as historical context; this task's own grep gate requires zero matches anywhere, including comments
- **Fix:** Reworded the comment to describe the superseded function generically ("`mediaViewerNavigation.ts`'s now fully removed zoom-toggle helper") without naming it
- **Files modified:** `frontend/src/lib/mediaViewerZoom.ts`
- **Commit:** `7ea3b5ed`

**3. [Rule 1 - Doc accuracy] `FansubMediaLightbox.tsx`'s module doc comment still described the 2-stage Escape sequence**
- **Found during:** Final plan-level verification sweep, after Task 3's commit
- **Issue:** The doc comment above `FansubMediaLightbox` still read "zweistufige Escape-Sequenz" (two-stage) even though the function body now implements D-37's 3-stage zoom→panel→viewer sequence
- **Fix:** Updated the comment to "dreistufige Escape-Sequenz (Zoom -> Panel -> Viewer, D-37)"
- **Files modified:** `frontend/src/components/fansubs/FansubMediaLightbox.tsx`
- **Commit:** `2795f85f` (separate small commit, made after Task 3's own commit since the inconsistency was only caught during the final sweep)

### Out-of-Scope Discoveries (not fixed, logged to deferred-items.md)

- `src/components/ui/ResponsiveImage.config.test.ts`'s `allows only the configured Team4s API media namespace for responsive group logos` test fails on a broader verification sweep (`vitest run src/components/fansubs src/lib src/components/groups src/components/ui src/app/episodes`, 816 passed / 1 failed). Confirmed pre-existing and unrelated — last touched in commit `d8124822` (Phase 173), and none of this plan's seven files touch `src/components/ui/ResponsiveImage*`. Logged to `.planning/phases/177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste/deferred-items.md`.

## Issues Encountered

None beyond the two auto-fixed items above (both resolved within budget, well under the 3-attempt limit).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

This was the last planned wave of Phase 177's gap-closure work for Live-UAT Runde 2 (D-33 through D-39). The viewer now has, end to end:
- A real fit→2x→4x→fit zoom cycle (double-click or the top-bar magnifier button)
- Clamped mouse/touch drag-pan that never reveals empty stage margin
- Continuous pinch-zoom on touch devices, independent of the fixed click steps
- Cursor-anchored mouse-wheel zoom while zoomed, unchanged D-29 wheel-navigate while at fit
- Touch-swipe navigation at fit / pan while zoomed (D-03 unchanged for the fit case)
- A 3-stage Escape sequence (zoom → caption panel → viewer)
- Unconditional zoom/pan reset on every image navigation

All of this is built on Plan 177-12's restyled chrome and Plan 177-13's unit-tested pure math, with zero regressions to any of the five existing consumer surfaces (`ReleaseGallery`, `FansubGroupMediaBlock`, `ScreenshotGallery`, `ProjectMemberMediaGallery`, `GroupAssetsExperience`) or their test suites. The orchestrator can now re-run Plan 177-08's Task 2 Live-UAT checkpoint for the third time against this viewer shell.

Two items are flagged for live-device verification only (not unit-testable, per the plan's own note): double-tap-to-zoom timing on real mobile Safari/Chrome, and the two-finger pinch gesture (jsdom cannot simulate multi-touch).

## Known Stubs

None — no hardcoded empty values, placeholder text, or unwired data sources were introduced by this plan.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/useMediaViewerZoomPan.ts
- FOUND: frontend/src/components/fansubs/MediaViewerStage.tsx
- FOUND: frontend/src/components/fansubs/MediaViewerStage.module.css
- FOUND: frontend/src/lib/mediaViewerNavigation.ts
- FOUND: frontend/src/lib/mediaViewerNavigation.test.ts
- FOUND: frontend/src/components/fansubs/FansubMediaLightbox.tsx
- FOUND: frontend/src/components/fansubs/FansubMediaLightbox.module.css
- FOUND: commit 92e96c1f (Task 1)
- FOUND: commit 7ea3b5ed (Task 2)
- FOUND: commit 81b2b9a0 (Task 3)
- FOUND: commit 2795f85f (doc follow-up)
