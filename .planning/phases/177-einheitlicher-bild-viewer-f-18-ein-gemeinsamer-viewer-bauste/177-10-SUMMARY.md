---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 10
subsystem: ui
tags: [react, vitest, media-viewer, thumbnail-strip, wheel-navigation, caption-panel]

# Dependency graph
requires:
  - phase: 177 (Plan 01)
    provides: mediaViewerNavigation.ts with wrapIndex/computeSwipeNavigation/nextZoomState/selectDisplaySrc
  - phase: 177 (Plan 09)
    provides: FocalCarouselInternals.tsx centeredScrollLeft/directItemElements, NavArrow primitive, Modal stage chrome
provides:
  - "resolveWheelNavigation/shouldThrottleWheelNavigation/shouldShowNavigationControls appended to mediaViewerNavigation.ts (D-29/D-32)"
  - "New mediaViewerCaptionPanel.ts with isCaptionOverflowing/resolveEscapeTarget/resetCaptionPanelOpen/resolveWheelOrSwipeTarget (D-31)"
  - "New global ThumbnailStrip primitive under components/ui/ (D-28), reusing FocalCarouselInternals.tsx's centeredScrollLeft/directItemElements"
affects: ["177-11 (viewer shell wiring)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-13-compliant pure decision functions for viewer interaction logic (zero render()/fireEvent in their tests)"
    - "Global components/ui/ primitives that are direct-imported rather than barrel-exported (ResponsiveImage precedent, now also ThumbnailStrip)"

key-files:
  created:
    - frontend/src/lib/mediaViewerCaptionPanel.ts
    - frontend/src/lib/mediaViewerCaptionPanel.test.ts
    - frontend/src/components/ui/ThumbnailStrip.tsx
    - frontend/src/components/ui/ThumbnailStrip.module.css
  modified:
    - frontend/src/lib/mediaViewerNavigation.ts
    - frontend/src/lib/mediaViewerNavigation.test.ts

key-decisions:
  - "ThumbnailStrip deliberately omits FocalCarouselInternals.tsx's nearestOwnedItemIndex (scroll-position-to-index inference) because activeIndex is always caller-controlled, not derived from scroll position"
  - "ThumbnailStrip is not added to components/ui/index.ts to avoid a same-wave file conflict with Plan 177-09 (which edits index.ts for NavArrow); ResponsiveImage.tsx is the existing precedent for a direct-imported, non-barrel-exported global primitive"

patterns-established:
  - "Caption-panel decisions (overflow detection, two-stage Escape, panel-reset-on-navigate, wheel/swipe arbitration) live as pure functions in a dedicated mediaViewerCaptionPanel.ts, separate from the DOM-measurement side effect that feeds them"

requirements-completed: [D-28, D-29, D-31, D-32]

# Metrics
duration: 8min
completed: 2026-10-09
---

# Phase 177 Plan 10: Media-Viewer Gap-Fix Pure Logic + ThumbnailStrip Summary

**Added three wheel-navigation/visibility pure functions to mediaViewerNavigation.ts, a new mediaViewerCaptionPanel.ts with four caption-panel decision functions, and a new global ThumbnailStrip primitive reusing the carousel's existing scroll-centering math — all D-13-compliant, zero render()/fireEvent.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-09T15:59:00Z
- **Completed:** 2026-10-09T16:01:33Z
- **Tasks:** 2
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments
- `mediaViewerNavigation.ts` now exports `resolveWheelNavigation`, `shouldThrottleWheelNavigation`, and `shouldShowNavigationControls` (D-29 wheel direction/throttle, D-32 single-image visibility predicate) as a single named source of truth instead of inline comparisons at each call site.
- New `mediaViewerCaptionPanel.ts` holds all four D-31 caption-panel decisions (`isCaptionOverflowing`, `resolveEscapeTarget`, `resetCaptionPanelOpen`, `resolveWheelOrSwipeTarget`) as directly-testable pure functions.
- New global `ThumbnailStrip` primitive under `frontend/src/components/ui/` (D-28/D-11) — full-width horizontal thumbnail strip with active-item highlight, click-to-jump, auto-scroll-into-view (reusing `centeredScrollLeft`/`directItemElements` verbatim), native non-passive horizontal wheel scrolling, and a position counter. Renders nothing below two items (D-32).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend mediaViewerNavigation.ts + new mediaViewerCaptionPanel.ts** - `6287339e` (feat)
2. **Task 2: Build the ThumbnailStrip global primitive (D-28)** - `8efa73d1` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/lib/mediaViewerNavigation.ts` - appended 3 new exported pure functions (wheel direction, wheel throttle, single-image visibility predicate)
- `frontend/src/lib/mediaViewerNavigation.test.ts` - appended matching describe/it blocks, German descriptions with real umlauts
- `frontend/src/lib/mediaViewerCaptionPanel.ts` - new file, 4 exported pure functions for D-31 caption-panel decisions
- `frontend/src/lib/mediaViewerCaptionPanel.test.ts` - new file, zero `@testing-library/react`/`render`/`fireEvent`
- `frontend/src/components/ui/ThumbnailStrip.tsx` - new global primitive (80 lines, well under the 450-line limit)
- `frontend/src/components/ui/ThumbnailStrip.module.css` - companion styles using existing design tokens (`--accent-primary`, `--surface-stage`, `--space-*`, `--radius-lg`)

## Decisions Made
- Followed the plan's explicit guidance to omit `nearestOwnedItemIndex` reuse in `ThumbnailStrip` (scroll-position-to-index inference is irrelevant when `activeIndex` is always caller-controlled) — intentional, not an oversight.
- Followed the plan's explicit guidance to not add `ThumbnailStrip` to `components/ui/index.ts`, avoiding a same-wave file conflict with Plan 177-09's `index.ts` edit (NavArrow barrel export) and following the existing `ResponsiveImage.tsx` direct-import precedent.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria (exact function signatures, exact aria-label pattern, exact D-32 guard, exact reuse import, zero render/fireEvent, line budget, barrel-export absence) matched the plan's prescribed code verbatim.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All D-29/D-31/D-32 decision logic exists as directly-testable pure functions, and the D-28 thumbnail strip exists as a reusable global primitive built on the carousel's existing scroll-centering math. Plan 177-11 can now wire `mediaViewerNavigation.ts`'s three new functions into `MediaViewerStage.tsx`, `mediaViewerCaptionPanel.ts`'s four functions into `MediaViewerCaption.tsx`, and `ThumbnailStrip` into the viewer shell, with no further logic design needed. This plan touched zero files Plan 177-09 or Plan 177-11 touch, so it ran with no merge/ordering risk relative to either.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

All 7 created/modified files found on disk; both task commit hashes (`6287339e`, `8efa73d1`) found in git history.
