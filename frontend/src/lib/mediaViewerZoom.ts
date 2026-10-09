/**
 * Pure, directly-testable logic for the unified media viewer's multi-level
 * zoom-with-pan system (Phase 177 Gap-Fix, D-37, Live-UAT Runde 2).
 *
 * D-13 requires this phase's new logic to be covered by directly-callable
 * tests (no `render`/`fireEvent`). D-37 replaces the earlier binary
 * fit<->100% toggle (`mediaViewerNavigation.ts`'s `nextZoomState`, now
 * superseded) with a real fit -> 2x -> 4x cycle plus continuous pinch/wheel
 * zoom and drag/touch pan. Every level in this file is expressed relative to
 * the already-fitted display size ("1" means "eingepasst"/fit), never the
 * image's native pixel resolution -- D-37 is explicit that a small,
 * already-upscaled image must double from its fitted size at "2x", not jump
 * back to native pixels. Actual DOM measurement (container/image rects,
 * pointer/touch event coordinates) is a browser side effect and stays in the
 * Plan 177-14 hook that owns the refs -- this file only holds the pure
 * arithmetic built on top of already-extracted plain numbers/points.
 */

/** The three fixed click/tap zoom levels: fit, 2x, 4x (D-37). */
export const ZOOM_STEPS = [1, 2, 4] as const

/** Lower bound of the zoom range -- "eingepasst" (fit). */
export const ZOOM_LEVEL_MIN = 1

/** Upper bound of the zoom range -- the top of the click cycle (4x). */
export const ZOOM_LEVEL_MAX = 4

/**
 * Bounds any zoom level (including continuous pinch/wheel values between the
 * fixed steps) into the valid `[ZOOM_LEVEL_MIN, ZOOM_LEVEL_MAX]` range.
 */
export function clampZoomLevel(level: number): number {
  return Math.min(ZOOM_LEVEL_MAX, Math.max(ZOOM_LEVEL_MIN, level))
}

/**
 * "Is the viewer currently zoomed" predicate, used to gate Escape priority
 * (D-37), wheel navigate-vs-zoom arbitration (`resolveStageWheelAction`), and
 * swipe navigate-vs-pan arbitration (`resolveStageSwipeAction`). Uses a 1%
 * tolerance above exact fit so a pinch/wheel gesture that settles back
 * near-but-not-exactly at `1` is correctly treated as "at fit" rather than
 * getting stuck gating those decisions as if still zoomed.
 */
export function isZoomed(level: number): boolean {
  return level > 1.01
}

/**
 * Advances to the next fixed step strictly greater than `current + 0.05` (a
 * small tolerance so clicking right at/near a step advances PAST it, not
 * back to it), wrapping to `ZOOM_STEPS[0]` once at or past the top step.
 * The tolerance lets a continuous pinch/wheel value sitting between two
 * fixed steps keep escalating toward the next one on the next click, instead
 * of snapping backwards to the step it already passed.
 */
export function cycleZoomLevel(current: number): number {
  const next = ZOOM_STEPS.find((step) => step > current + 0.05)
  return next ?? ZOOM_STEPS[0]
}

/**
 * Reset-on-navigate value (D-37, mirrors `resetCaptionPanelOpen`'s pattern in
 * `mediaViewerCaptionPanel.ts`): the viewer shell's item-change effect calls
 * this on every navigation and assigns the result to its zoom-level state,
 * unconditionally returning to "eingepasst".
 */
export function resetZoomLevel(): number {
  return 1
}

export interface ContainedSizeParams {
  containerWidth: number
  containerHeight: number
  naturalWidth: number
  naturalHeight: number
}

export interface Size {
  width: number
  height: number
}

/**
 * Reproduces the browser's own `object-fit: contain` box-fit math so the
 * "eingepasst" size is known as plain numbers for pan-clamp/zoom-around-point
 * math, without re-measuring the rendered `<img>` element. Exactly one axis
 * fills the container; the other scales down proportionally.
 */
export function computeContainedSize(params: ContainedSizeParams): Size {
  const { containerWidth, containerHeight, naturalWidth, naturalHeight } = params
  const containerAspect = containerWidth / containerHeight
  const imageAspect = naturalWidth / naturalHeight

  if (imageAspect < containerAspect) {
    const height = containerHeight
    return { width: height * imageAspect, height }
  }

  const width = containerWidth
  return { width, height: width / imageAspect }
}

export interface ClampPanOffsetParams {
  containerWidth: number
  containerHeight: number
  contentWidth: number
  contentHeight: number
  offsetX: number
  offsetY: number
}

export interface PanOffset {
  x: number
  y: number
}

/**
 * Clamps a requested pan offset so the centered-then-offset content box
 * always fully covers the container on both axes (D-37: "niemals ein leerer
 * Rand ... in den sichtbaren Bereich gezogen werden kann"). The maximum
 * travel per axis is half that axis's overflow (content size minus
 * container size) -- an axis with no overflow (content <= container) allows
 * zero pan on that axis.
 */
export function clampPanOffset(params: ClampPanOffsetParams): PanOffset {
  const { containerWidth, containerHeight, contentWidth, contentHeight, offsetX, offsetY } = params
  const maxTravelX = Math.max(0, (contentWidth - containerWidth) / 2)
  const maxTravelY = Math.max(0, (contentHeight - containerHeight) / 2)

  return {
    x: Math.min(maxTravelX, Math.max(-maxTravelX, offsetX)),
    y: Math.min(maxTravelY, Math.max(-maxTravelY, offsetY)),
  }
}

export interface ZoomAroundPointParams {
  pointerOffsetFromCenter: number
  previousOffset: number
  previousLevel: number
  nextLevel: number
}

/**
 * Solves, per axis, for the new (pre-clamp) pan offset such that the content
 * point currently under the pointer stays at the same screen position across
 * a zoom-level change (D-37 "Zoom-um-Cursorpunkt"). Zooming exactly at the
 * content's center (`pointerOffsetFromCenter === 0`) never introduces pan;
 * zooming back toward fit (`nextLevel === 1`) always trends the result back
 * toward centered, since the fit level has no room to pan at all.
 */
export function computeZoomAroundPointOffset(params: ZoomAroundPointParams): number {
  const { pointerOffsetFromCenter, previousOffset, previousLevel, nextLevel } = params
  const ratio = nextLevel / previousLevel
  return pointerOffsetFromCenter * (1 - ratio) + previousOffset * ratio
}

/**
 * Converts a wheel gesture's `deltaY` into a new (clamped) zoom level while
 * already zoomed (D-37: the wheel zooms around the cursor point once zoomed,
 * instead of navigating). `deltaY < 0` (scroll up) zooms in; `deltaY > 0`
 * (scroll down) zooms out.
 */
export function computeWheelZoomLevel(currentLevel: number, deltaY: number, sensitivity: number): number {
  return clampZoomLevel(currentLevel - deltaY * sensitivity)
}

/**
 * Converts a continuous pinch gesture's current finger-span distance into a
 * new (clamped) zoom level, anchored to the gesture's START distance/level
 * (not the previous tick) so repeated recalculation across a long pinch never
 * compounds rounding drift. Defends against a divide-by-zero before both
 * touches have reported a position (`startDistance <= 0`) by holding at the
 * gesture's starting level.
 */
export function resolvePinchZoomLevel(startLevel: number, startDistance: number, currentDistance: number): number {
  if (startDistance <= 0) {
    return clampZoomLevel(startLevel)
  }

  return clampZoomLevel(startLevel * (currentDistance / startDistance))
}

export interface Point {
  x: number
  y: number
}

/**
 * Euclidean distance between two touch points -- the pinch gesture's current
 * finger span, extracted as plain `{x,y}` points so this math is directly
 * testable without any DOM/TouchEvent involvement.
 */
export function distanceBetweenPoints(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/**
 * Midpoint between two touch points -- the pinch gesture's anchor, used by
 * the Plan 177-14 hook as the `pointerOffsetFromCenter` basis for
 * `computeZoomAroundPointOffset` during a pinch.
 */
export function midpointBetweenPoints(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Wheel-gesture stage-action arbitration (D-37), checked AFTER
 * `resolveWheelOrSwipeTarget` (`mediaViewerCaptionPanel.ts`, unchanged by
 * this file) has already confirmed the gesture belongs to the stage, not the
 * open caption panel: navigate between images while at fit (D-29 unchanged),
 * zoom around the cursor point once zoomed.
 */
export function resolveStageWheelAction(zoomed: boolean): 'zoom' | 'navigate' {
  return zoomed ? 'zoom' : 'navigate'
}

/**
 * Swipe-gesture stage-action arbitration (D-37), same layering as
 * `resolveStageWheelAction`: navigate between images while at fit (D-03
 * unchanged for this case), pan the visible crop once zoomed.
 */
export function resolveStageSwipeAction(zoomed: boolean): 'pan' | 'navigate' {
  return zoomed ? 'pan' : 'navigate'
}

export interface DragPanOffsetParams {
  previousOffsetX: number
  previousOffsetY: number
  dragDeltaX: number
  dragDeltaY: number
}

/**
 * Accumulates a drag/one-finger-pan gesture's delta onto the previous pan
 * offset. The caller still clamps the result via `clampPanOffset` before
 * applying it, so this function stays a plain, unbounded addition.
 */
export function computeDragPanOffset(params: DragPanOffsetParams): PanOffset {
  const { previousOffsetX, previousOffsetY, dragDeltaX, dragDeltaY } = params
  return { x: previousOffsetX + dragDeltaX, y: previousOffsetY + dragDeltaY }
}
