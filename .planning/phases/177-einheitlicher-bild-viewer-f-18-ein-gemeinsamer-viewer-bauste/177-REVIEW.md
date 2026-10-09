---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
reviewed: 2026-10-09T00:00:00Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go
  - backend/internal/repository/release_detail_public_repository.go
  - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
  - frontend/src/app/dev/ui-system/page.tsx
  - frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.test.ts
  - frontend/src/app/episodes/[id]/components/ScreenshotGallery/screenshotGalleryMapping.ts
  - frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.module.css
  - frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx
  - frontend/src/app/episodes/[id]/page.tsx
  - frontend/src/components/fansubs/FansubMediaLightbox.module.css
  - frontend/src/components/fansubs/FansubMediaLightbox.test.tsx
  - frontend/src/components/fansubs/FansubMediaLightbox.tsx
  - frontend/src/components/fansubs/MediaViewerCaption.module.css
  - frontend/src/components/fansubs/MediaViewerCaption.tsx
  - frontend/src/components/fansubs/MediaViewerHeader.module.css
  - frontend/src/components/fansubs/MediaViewerHeader.tsx
  - frontend/src/components/fansubs/MediaViewerStage.module.css
  - frontend/src/components/fansubs/MediaViewerStage.test.ts
  - frontend/src/components/fansubs/MediaViewerStage.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css
  - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx
  - frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.test.ts
  - frontend/src/components/fansubs/projectMember/projectMemberMediaMapping.ts
  - frontend/src/components/fansubs/useMediaViewerZoomPan.ts
  - frontend/src/components/groups/groupAssetMediaMapping.test.ts
  - frontend/src/components/groups/groupAssetMediaMapping.ts
  - frontend/src/components/groups/GroupAssetsExperience.module.css
  - frontend/src/components/groups/GroupAssetsExperience.tsx
  - frontend/src/components/ui/Button.module.css
  - frontend/src/components/ui/Button.tsx
  - frontend/src/components/ui/FocalCarouselInternals.tsx
  - frontend/src/components/ui/index.ts
  - frontend/src/components/ui/Modal.module.css
  - frontend/src/components/ui/Modal.tsx
  - frontend/src/components/ui/NavArrow.module.css
  - frontend/src/components/ui/NavArrow.tsx
  - frontend/src/components/ui/ThumbnailStrip.module.css
  - frontend/src/components/ui/ThumbnailStrip.tsx
  - frontend/src/lib/mediaViewerCaptionPanel.test.ts
  - frontend/src/lib/mediaViewerCaptionPanel.ts
  - frontend/src/lib/mediaViewerMetadata.test.ts
  - frontend/src/lib/mediaViewerMetadata.ts
  - frontend/src/lib/mediaViewerNavigation.test.ts
  - frontend/src/lib/mediaViewerNavigation.ts
  - frontend/src/lib/mediaViewerZoom.test.ts
  - frontend/src/lib/mediaViewerZoom.ts
  - frontend/src/styles/globals.css
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 177: Code Review Report

**Reviewed:** 2026-10-09
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

## Summary

Phase 177 introduces a shared, cross-surface media viewer (`FansubMediaLightbox` +
`MediaViewerHeader`/`MediaViewerStage`/`MediaViewerCaption` + `useMediaViewerZoomPan`)
on top of `Modal`'s new `variant="stage"`, plus several new `@/components/ui`
primitives (`NavArrow`, `ThumbnailStrip`) and pure, directly-testable logic modules
(`mediaViewerNavigation.ts`, `mediaViewerZoom.ts`, `mediaViewerMetadata.ts`,
`mediaViewerCaptionPanel.ts`). The pure-logic layer is well-factored and the unit
tests for it are accurate and match the implementations exactly — no defects found
there. The backend cursor-pagination `DisplayURL` fallback fix is correct and the
accompanying test genuinely exercises the repository method against a real fixture
(compliant with the project's test-style rule).

The defects found are concentrated in the consumer-facing wiring: a CSS gradient
that renders invisible (silently breaking the documented "fade out" caption
affordance), a new global primitive that was not added to the `@/components/ui`
barrel (inconsistent with its sibling `NavArrow`), a pre-existing
infinite-scroll retry path in `ScreenshotGallery.tsx` that was carried over
unchanged during this phase's migration and can retry a failing request
indefinitely without backoff, a caption-overflow measurement that never
re-runs on viewport resize, and an original-image preload with no `onerror`
handler that can leave a "wird geladen …" pill stuck forever. No Critical/security
issues were found in the reviewed files.

## Warnings

### WR-01: Caption overflow fade gradient has identical stops — renders invisible

**File:** `frontend/src/components/fansubs/MediaViewerCaption.module.css:22-30`
**Issue:** `.clampedFading::after` is supposed to fade the bottom of a clamped,
overflowing caption (per the component's own doc-comment: "Lange Bildunterschriften
… laufen mit Fade aus"). The gradient is declared as
`linear-gradient(to bottom, transparent, transparent)` — both color stops are
`transparent`, so this pseudo-element paints nothing at all. The documented fade
effect simply does not exist; a long caption is hard-clipped at `max-height: 6em`
with no visual cue that it continues, other than the separately-rendered
"Weiterlesen" button.
**Fix:**
```css
.clampedFading::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2.4em;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.72));
}
```
(or whatever opaque stage-matching color was intended — the point is the two stops
must differ.)

### WR-02: `ThumbnailStrip` is a new `@/components/ui` primitive but is missing from the barrel export

**File:** `frontend/src/components/ui/index.ts` (missing entry); `frontend/src/components/ui/ThumbnailStrip.tsx:29`
**Issue:** This phase adds two new global UI primitives, `NavArrow` and
`ThumbnailStrip`. `NavArrow` was correctly added to `index.ts`
(`export * from './NavArrow'`), but `ThumbnailStrip` was not, even though it is
documented in its own file header as "Neues globales Primitive (D-11) statt
feature-lokalem Bau". Every current consumer happens to import it via the direct
file path (`@/components/ui/ThumbnailStrip`), so nothing breaks today, but this is
inconsistent with the project's own convention (every other primitive is
re-exported from `@/components/ui`) and will silently continue to diverge as more
call sites are added.
**Fix:** Add `export * from './ThumbnailStrip'` to `frontend/src/components/ui/index.ts`.

### WR-03: `ScreenshotGallery`'s infinite-scroll error path can retry indefinitely with no backoff

**File:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx:33-86`
**Issue:** `fetchImages`'s `catch` block (lines 48-50) only sets `error`; it never
clears `cursor` or sets `hasMore = false`. The `IntersectionObserver` effect
(lines 63-86) re-runs whenever `[cursor, hasMore, loading, fetchImages]` change and
creates a brand-new `IntersectionObserver`, which invokes its callback immediately
with the trigger element's current intersection state. If a page-2+ fetch fails
while the (still-rendered) `loadTriggerRef` div remains in the viewport, the
sequence `loading:false → effect reruns → new observer fires immediately (cursor is
still the same, non-null, failing cursor) → fetchImages(cursor) → loading:true →
loading:false → …` repeats with no delay/backoff for as long as the trigger stays
visible and the backend keeps failing. This predates this phase (the effect itself
is unchanged by the 177-05 migration commit), but it is part of the file under
review and is now reachable from more places (shared `FansubMediaLightbox`
consumer).
**Fix:** On error, also set `hasMore(false)` (forcing the user to use the existing
"Erneut versuchen" button to resume), or track a retry counter/backoff timer and
stop re-observing after N consecutive failures for the same cursor.

### WR-04: Caption overflow detection never re-evaluates on viewport resize

**File:** `frontend/src/components/fansubs/MediaViewerCaption.tsx:34-42`
**Issue:** `isCaptionOverflowing` is only recomputed inside a `useLayoutEffect`
keyed on `[caption]`. If the viewport is resized or the device is rotated after the
viewer is already open (common on mobile, and easy to trigger via devtools/
split-screen on desktop), the caption's wrapped line count can change, but
`overflowing` is never recalculated. A caption that now overflows at the new width
will stay silently clipped at `max-height: 6em` with no "Weiterlesen" button ever
appearing, permanently hiding part of the text; conversely a caption that no longer
overflows could keep showing an unnecessary "Weiterlesen" button.
**Fix:** Add a `ResizeObserver` (or `window.resize` listener) on `clampedRef.current`
that re-runs the same `isCaptionOverflowing` check, in addition to the existing
`[caption]`-keyed effect.

### WR-05: Original-image preload has no error handler — loading pill can get stuck forever

**File:** `frontend/src/components/fansubs/MediaViewerStage.tsx:94-108` (preload effect), `45-53` (`shouldShowLoadingPill`)
**Issue:** The preload effect only wires `preload.onload`; there is no
`preload.onerror`. If `originalUrl` 404s, is blocked by CORS, or otherwise fails to
load, `originalLoaded` never becomes `true`. Because a valid `display_url`/
`thumbnail_url` is shown in the meantime via `selectDisplaySrc`, the visible `<img>`
element loads successfully and `hasError` (driven by that element's own `onError`)
never becomes `true` either. The result: `shouldShowLoadingPill` keeps returning
`true` indefinitely (`!hasError && displayUrl !== originalUrl && !originalLoaded`),
so the "Originalbild wird geladen …" pill is shown forever even though the original
will never actually finish loading.
**Fix:**
```ts
useEffect(() => {
  if (!originalUrl) return
  if (typeof window === 'undefined' || typeof window.Image === 'undefined') return
  let cancelled = false
  const preload = new window.Image()
  preload.onload = () => { if (!cancelled) setOriginalLoaded(true) }
  preload.onerror = () => { if (!cancelled) setOriginalLoaded(true) } // give up, stop showing the pill
  preload.src = originalUrl
  return () => { cancelled = true }
}, [item.id, originalUrl])
```
(or introduce a distinct `originalFailed` flag and factor it into
`shouldShowLoadingPill` instead of reusing `originalLoaded`.)

### WR-06: Arrow/Home/End keyboard navigation is not gated by the open caption panel, unlike wheel/swipe

**File:** `frontend/src/components/fansubs/FansubMediaLightbox.tsx:68-91`
**Issue:** `resolveWheelOrSwipeTarget(captionPanelOpen)` (used by the wheel listener
in `useMediaViewerZoomPan.ts` and the touch-swipe handler) deliberately routes
wheel/swipe gestures to the open "Weiterlesen" panel instead of navigating images
while that panel is open. The `window`-level `keydown` handler for
`ArrowLeft`/`ArrowRight`/`Home`/`End` has no equivalent check: pressing any of
these keys while the full-caption panel is open still navigates to a different
image (which then auto-closes the panel via the item-change effect), silently
discarding the user's "reading" context. This is inconsistent with the
wheel/swipe arbitration that was clearly designed for this exact scenario.
**Fix:** Gate the arrow/home/end branches the same way the wheel/swipe code does,
e.g. `if (resolveWheelOrSwipeTarget(captionPanelOpen) === 'panel') return` at the
top of `handleKeyDown`.

## Info

### IN-01: Dead CSS left behind after migrating the retry button to the `Button` primitive

**File:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.module.css:109-127`
**Issue:** The 177-05 migration commit replaced the native
`<button className={styles.screenshotRetryButton}>` with
`<Button variant="secondary">` in `ScreenshotGallery.tsx`, but left
`.screenshotRetryButton`, `.screenshotRetryButton:hover`, and
`.screenshotRetryButton:focus-visible` in the CSS module. These rules are now
unreachable dead code.
**Fix:** Delete the three orphaned rules (lines 109-127).

### IN-02: `ScreenshotGallery.tsx`'s new data-fetching/infinite-scroll/lightbox-open behavior has no dedicated test

**File:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/` (directory)
**Issue:** Only the pure mapping helper (`screenshotGalleryMapping.ts`) has a test
file. The component itself — which this phase changed to call
`getGroupReleaseImages`, build `lightboxItems`, and drive the shared
`FansubMediaLightbox` — has no `ScreenshotGallery.test.tsx`, unlike the
structurally similar `ProjectMemberMediaGallery.test.tsx` and
`ReleaseGallery.test.tsx` in this same PR, which do cover their analogous
fetch/paginate/open-viewer flows (including the fetch-failure path). This gap is
exactly why WR-03 above went unnoticed by the test suite.
**Fix:** Add a `ScreenshotGallery.test.tsx` mirroring `ProjectMemberMediaGallery.test.tsx`'s
coverage of initial load, pagination, viewer open/close, and the fetch-failure
path.

### IN-03: `ScreenshotGallery.module.css` uses hardcoded colors / undefined design tokens instead of the shared token system

**File:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.module.css:7-12, 50, 96-127`
**Issue:** This file falls back to raw hex values via CSS custom properties that are
never defined anywhere in `globals.css` (`--bg-light`, `--primary-color`), so the
fallback literal is always what actually renders, and uses ad-hoc red
(`#fee`/`#fcc`/`#c33`/`#a22`) for its error state instead of the project's existing
`--color-error`/`--color-danger` tokens (already used correctly in this same PR by
`ProjectMemberMediaGallery.module.css`'s `.error { color: var(--color-error, #dc3545); }`).
**Fix:** Replace the undefined custom properties and ad-hoc reds with the project's
existing design tokens (e.g. `var(--text-strong)`, `var(--surface-sunken)`,
`var(--color-error)`), consistent with the rest of this phase's new CSS.

---

_Reviewed: 2026-10-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
