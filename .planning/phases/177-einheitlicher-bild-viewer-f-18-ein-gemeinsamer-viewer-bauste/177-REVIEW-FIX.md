---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
fixed_at: 2026-10-09T22:02:00Z
review_path: .planning/phases/177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste/177-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 177: Code Review Fix Report

**Fixed at:** 2026-10-09T22:02:00Z
**Source review:** .planning/phases/177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste/177-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01 through WR-06; fix_scope is `critical_warning`, so IN-01/IN-02/IN-03 were intentionally left out of scope)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: Caption overflow fade gradient has identical stops — renders invisible

**Files modified:** `frontend/src/components/fansubs/MediaViewerCaption.module.css`
**Commit:** a9f7d4fd
**Applied fix:** `.clampedFading::after`'s `linear-gradient` had both stops set to `transparent`, so it painted nothing. Changed the bottom stop to `rgba(0, 0, 0, 0.72)` (an opaque dark value consistent with the stage's existing overlay colors, e.g. `MediaViewerStage.module.css`'s `.loadingPill` at `rgba(0, 0, 0, 0.55)`), so the documented fade-out now actually renders.

### WR-02: `ThumbnailStrip` is a new `@/components/ui` primitive but is missing from the barrel export

**Files modified:** `frontend/src/components/ui/index.ts`
**Commit:** c3f4f0a4
**Applied fix:** Added `export * from './ThumbnailStrip'` alongside the other alphabetically-ordered primitive exports (between `Textarea` and `Toolbar`), matching the project convention already followed for its sibling `NavArrow`.

### WR-03: `ScreenshotGallery`'s infinite-scroll error path can retry indefinitely with no backoff

**Files modified:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx`
**Commit:** 896160cb
**Applied fix:** `fetchImages`'s `catch` block now also calls `setHasMore(false)` in addition to `setError(...)`. This removes the load-trigger `div` from the DOM (gated by `hasMore && !loading`), so the `IntersectionObserver` effect no longer re-fires immediately and indefinitely against a still-failing cursor. The existing "Erneut versuchen" button (`handleRetry`) already resets `hasMore(true)` and the cursor, so the recovery path is unchanged — this was the review's first suggested option, chosen over a retry-counter/backoff timer as the more surgical, lower-risk change for a file one of this phase's five protected pre-existing consumer call sites (D-07), where the bug itself (not the call-site wiring) is what needed fixing.

### WR-04: Caption overflow detection never re-evaluates on viewport resize

**Files modified:** `frontend/src/components/fansubs/MediaViewerCaption.tsx`
**Commit:** b45bc148
**Applied fix:** The existing `useLayoutEffect` keyed on `[caption]` now also attaches a `ResizeObserver` to the clamped paragraph node and re-runs the same `isCaptionOverflowing` measurement on resize, disconnecting on cleanup. No change to the already-tested pure function `isCaptionOverflowing` (`frontend/src/lib/mediaViewerCaptionPanel.ts`) was needed — this is DOM-side-effect wiring only, consistent with D-13 (pure decision logic stays pure/tested; DOM measurement side effects stay in the component).

### WR-05: Original-image preload has no error handler — loading pill can get stuck forever

**Files modified:** `frontend/src/components/fansubs/MediaViewerStage.tsx`
**Commit:** 7316f608
**Applied fix:** Added `preload.onerror` alongside the existing `preload.onload` in the original-image preload effect. On error it also calls `setOriginalLoaded(true)` (reusing the existing flag as a "give up" signal, per the review's suggested simpler alternative), so `shouldShowLoadingPill` stops returning `true` once the original is known to have failed, instead of forever. `shouldShowLoadingPill`'s existing pure-function tests (`MediaViewerStage.test.ts`) were unaffected since the `originalLoaded` contract they test did not change.

### WR-06: Arrow/Home/End keyboard navigation is not gated by the open caption panel, unlike wheel/swipe

**Files modified:** `frontend/src/components/fansubs/FansubMediaLightbox.tsx`
**Commit:** 43c6eafb
**Applied fix:** The `window`-level `keydown` handler now calls the same `resolveWheelOrSwipeTarget(captionPanelOpen)` arbitration already used by the wheel listener (`useMediaViewerZoomPan.ts`) and touch-swipe handler, returning early when the panel owns the gesture. `captionPanelOpen` was added to the effect's dependency array to avoid a stale closure. Imported `resolveWheelOrSwipeTarget` from the existing `@/lib/mediaViewerCaptionPanel` import.

## Skipped Issues

None — all 6 in-scope findings were fixed.

---

_Fixed: 2026-10-09T22:02:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
