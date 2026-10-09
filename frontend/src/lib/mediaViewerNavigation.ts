/**
 * Pure, directly-testable logic for the unified media viewer (Phase 177, F-18).
 *
 * D-13 requires this phase's new logic to be covered by directly-callable tests
 * (no `render`/`fireEvent`). 177-RESEARCH.md Pitfall 1 notes that every existing
 * viewer test in this cluster uses `render()`+`fireEvent`, which cannot satisfy
 * that rule — so the wrap-around index math, swipe-threshold navigation decision,
 * zoom-toggle state transition, and progressive-load URL selection are extracted
 * here as standalone functions with zero React/DOM involvement. Plan 177-04 (the
 * shared viewer shell) imports these rather than re-inlining the logic again.
 */

/**
 * Wrap-around index arithmetic for ArrowLeft/ArrowRight/Home/End navigation
 * and swipe-triggered navigation. `delta` is typically `1` (next) or `-1` (prev).
 *
 * Handles the single-item list case (`total === 1`) without producing NaN or
 * throwing — the result is always `0` in that case.
 */
export function wrapIndex(current: number, total: number, delta: number): number {
  return ((current + delta) % total + total) % total
}

/**
 * Decides whether a touch-swipe gesture should trigger navigation, per the
 * UI-SPEC viewer interaction contract: the horizontal delta must meet the
 * threshold (absolute value) AND be horizontal-dominant (|deltaX| > |deltaY|).
 * Vertical-dominant gestures return `null` so normal scrolling is not hijacked.
 *
 * `deltaX > 0` means the finger moved right (swipe toward the previous item);
 * `deltaX < 0` means the finger moved left (swipe toward the next item).
 */
export function computeSwipeNavigation(
  deltaX: number,
  deltaY: number,
  threshold: number,
): 'prev' | 'next' | null {
  const absDeltaX = Math.abs(deltaX)
  const absDeltaY = Math.abs(deltaY)

  if (absDeltaX < threshold || absDeltaX <= absDeltaY) {
    return null
  }

  return deltaX > 0 ? 'prev' : 'next'
}

export interface SelectDisplaySrcParams {
  displayUrl: string | null | undefined
  originalUrl: string | null | undefined
  thumbnailUrl: string | null | undefined
  originalLoaded: boolean
}

/**
 * Progressive-load URL selection: while the original image has not finished
 * preloading, show the best already-available URL (display -> original ->
 * thumbnail). Once the original has loaded, swap to it — unless it is
 * missing, in which case fall back to the same display/thumbnail chain so a
 * valid URL is never dropped in favor of `null`.
 */
export function selectDisplaySrc(params: SelectDisplaySrcParams): string | null {
  const { displayUrl, originalUrl, thumbnailUrl, originalLoaded } = params

  if (originalLoaded && originalUrl) {
    return originalUrl
  }

  return displayUrl ?? originalUrl ?? thumbnailUrl ?? null
}

/**
 * Wheel-navigation direction decision for the image stage (D-29, Live-UAT Runde
 * 1). A vertical mouse-wheel gesture over the stage (never over the thumbnail
 * strip, which scrolls horizontally per D-28) steps to the previous/next image.
 * `deltaY > 0` is a downward scroll (advance to the next image); `deltaY < 0`
 * is an upward scroll (go back); `deltaY === 0` is not a navigation gesture.
 */
export function resolveWheelNavigation(deltaY: number): 'prev' | 'next' | null {
  if (deltaY > 0) return 'next'
  if (deltaY < 0) return 'prev'
  return null
}

/**
 * Wheel-navigation throttle decision (D-29): prevents rapid/continuous wheel
 * scrolling from racing through many images at once. The very first
 * navigation (`lastNavigationAt === null`) is never throttled. Every
 * subsequent navigation is throttled while less than `throttleMs` has
 * elapsed since the last one.
 */
export function shouldThrottleWheelNavigation(
  now: number,
  lastNavigationAt: number | null,
  throttleMs: number,
): boolean {
  if (lastNavigationAt === null) return false
  return now - lastNavigationAt < throttleMs
}

/**
 * Single-image visibility predicate (D-32): navigation arrows and the
 * thumbnail strip are both gated on this exact same condition, so it is a
 * single named source of truth instead of a `> 1` comparison duplicated at
 * each call site.
 */
export function shouldShowNavigationControls(total: number): boolean {
  return total > 1
}
