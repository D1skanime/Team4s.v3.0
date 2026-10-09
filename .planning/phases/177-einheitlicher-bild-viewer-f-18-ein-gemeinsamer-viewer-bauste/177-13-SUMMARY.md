---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 13
subsystem: ui
tags: [zoom, pan, viewer, vitest, pure-functions, d-13, d-37]

# Dependency graph
requires:
  - phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
    provides: mediaViewerCaptionPanel.ts (D-31 two-stage Escape, caption overflow, panel-reset, wheel/swipe arbitration) and mediaViewerNavigation.ts (doc-comment/export style precedent)
provides:
  - mediaViewerZoom.ts with all 14 D-37 pure functions (zoom cycle, clamp, pan clamp, cursor-anchored zoom math, pinch math, point geometry, wheel/swipe stage-action arbitration, drag-pan math)
  - resolveEscapeTarget extended from a 2-way (panel/viewer) to a 3-way (zoom/panel/viewer) decision, zoom taking priority
affects: [177-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure decision functions for every D-37 gesture/zoom math, directly unit-tested per D-13 (no render/fireEvent)"
    - "Signature extension in place (zoomed boolean prepended) rather than a new wrapping function, preserving existing test meaning when the new parameter is false"

key-files:
  created:
    - frontend/src/lib/mediaViewerZoom.ts
    - frontend/src/lib/mediaViewerZoom.test.ts
  modified:
    - frontend/src/lib/mediaViewerCaptionPanel.ts
    - frontend/src/lib/mediaViewerCaptionPanel.test.ts

key-decisions:
  - "resolveEscapeTarget's signature was extended in place (leading zoomed: boolean) rather than wrapped by a new composing function, per the plan's explicit rationale: Escape has exactly one decision point and zoomed=false reduces to byte-identical D-31 behavior"
  - "resolveWheelOrSwipeTarget (panel-vs-stage) was left completely untouched; resolveStageWheelAction/resolveStageSwipeAction (zoom-vs-navigate) are layered on top of it as separate functions in mediaViewerZoom.ts rather than merged into it"

patterns-established:
  - "Zoom/pan levels are always expressed relative to the fitted display size (1 = eingepasst), never native pixel resolution, per D-37"

requirements-completed: [D-37]

# Metrics
duration: 2min
completed: 2026-10-09
---

# Phase 177 Plan 13: D-37 Zoom/Pan Pure Functions Summary

**14 pure D-37 zoom/pan functions (fit->2x->4x cycle, empty-margin-proof pan clamp, cursor-anchored zoom-around-point math, continuous pinch/wheel zoom, wheel/swipe stage-action arbitration) plus a 3-way zoom/panel/viewer Escape target, all covered by 50 concrete-numeric D-13 tests with zero DOM.**

## Performance

- **Duration:** 2 min (commit-to-commit; investigation/reading preceded this)
- **Started:** 2026-10-09T17:44:45Z
- **Completed:** 2026-10-09T17:45:17Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Built every D-37 decision function as a directly-callable pure function in a new `mediaViewerZoom.ts`: `cycleZoomLevel`, `clampZoomLevel`, `isZoomed`, `resetZoomLevel`, `computeContainedSize`, `clampPanOffset`, `computeZoomAroundPointOffset`, `computeWheelZoomLevel`, `resolvePinchZoomLevel`, `distanceBetweenPoints`, `midpointBetweenPoints`, `resolveStageWheelAction`, `resolveStageSwipeAction`, `computeDragPanOffset`, plus `ZOOM_STEPS`/`ZOOM_LEVEL_MIN`/`ZOOM_LEVEL_MAX` constants (17 total exports)
- Proved the pan-clamp's "never reveals empty margin" guarantee with an explicit boundary-vs-requested-value numeric assertion (`x: 300`, not the requested `500`), plus a mirrored Y-axis case
- Extended `resolveEscapeTarget` to a 3-way `'zoom' | 'panel' | 'viewer'` decision with zoom taking top priority, while preserving the exact D-31 panel/viewer behavior when `zoomed=false`
- 50 new/updated test assertions across both files, zero `render`/`fireEvent`, German `it()` descriptions with real umlauts throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mediaViewerZoom.ts -- zoom cycle, pan clamp, cursor-anchored zoom math, pinch math, wheel/swipe arbitration (D-37)** - `b09522d9` (feat)
2. **Task 2: Extend resolveEscapeTarget to a three-stage zoom/panel/viewer decision (D-37)** - `2d2dd86b` (feat)

_No TDD gate was used for this plan's `tdd="true"` tasks beyond the test-file-and-implementation-together commit pattern already matching the project's established `mediaViewerCaptionPanel.ts`/`mediaViewerNavigation.ts` precedent -- tests and implementation were authored and verified together per task, then committed as one atomic `feat` commit per task, consistent with how Plans 177-04 through 177-12 committed their own `type="auto" tdd="true"` tasks._

## Files Created/Modified
- `frontend/src/lib/mediaViewerZoom.ts` - 14 pure D-37 zoom/pan decision functions + 3 named constants, zero DOM/React
- `frontend/src/lib/mediaViewerZoom.test.ts` - 41 assertions covering every function with concrete numeric cases
- `frontend/src/lib/mediaViewerCaptionPanel.ts` - `resolveEscapeTarget` extended from 2-way to 3-way (zoom/panel/viewer); the other three exports (`isCaptionOverflowing`, `resetCaptionPanelOpen`, `resolveWheelOrSwipeTarget`) left untouched
- `frontend/src/lib/mediaViewerCaptionPanel.test.ts` - 2 existing `resolveEscapeTarget` cases updated to pass explicit `zoomed=false` (unchanged meaning), 2 new `zoomed=true` cases added

## Decisions Made
- `resolveEscapeTarget`'s signature was extended in place rather than wrapped, per the plan's explicit design rationale (Escape is one decision point; `zoomed=false` is byte-identical to the old behavior)
- `resolveWheelOrSwipeTarget` (panel-vs-stage gate) stays untouched; the new zoom-vs-navigate arbitration lives in separate functions in `mediaViewerZoom.ts`, avoiding merging two independent decisions into one function

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria (export counts, specific-function greps, zero render/fireEvent, the explicit `x: 300` boundary assertion, the exactly-one-expected-transient-tsc-error at `FansubMediaLightbox.tsx`, untouched-export verification) were verified and passed without needing any auto-fix.

## Issues Encountered

None. The one deliberately expected `tsc --noEmit` error (`FansubMediaLightbox.tsx(125,13): error TS2554: Expected 2 arguments, but got 1.`) appeared exactly as the plan predicted -- Plan 177-14 updates that call site to `resolveEscapeTarget(isZoomed(zoomLevel), captionPanelOpen)`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 177-14 can now import every D-37 math/decision function from `mediaViewerZoom.ts` and call the extended `resolveEscapeTarget(zoomed, panelOpen)` to wire the multi-level zoom-with-pan system into the actual `FansubMediaLightbox.tsx`/`MediaViewerStage.tsx`/`useMediaViewerZoomPan.ts` viewer shell, with no further math design needed. The only known blocker is the single expected transient `FansubMediaLightbox.tsx` compile error, which Plan 177-14 resolves as its own first task.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

- FOUND: frontend/src/lib/mediaViewerZoom.ts
- FOUND: frontend/src/lib/mediaViewerZoom.test.ts
- FOUND: frontend/src/lib/mediaViewerCaptionPanel.ts
- FOUND: frontend/src/lib/mediaViewerCaptionPanel.test.ts
- FOUND: commit b09522d9 (Task 1)
- FOUND: commit 2d2dd86b (Task 2)
