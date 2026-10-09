/**
 * Pure, directly-testable logic for the unified media viewer's caption
 * "Weiterlesen" panel (Phase 177 Gap-Fix, D-31, Live-UAT Runde 1).
 *
 * D-13 requires this phase's new logic to be covered by directly-callable
 * tests (no `render`/`fireEvent`). Actual DOM measurement
 * (`element.scrollHeight`/`element.clientHeight`) is a browser side effect
 * and stays in the component that owns the ref -- this file only holds the
 * pure decision built on top of those two already-measured numbers, plus the
 * panel's other small state decisions (two-stage Escape target, panel-reset
 * value on image change, wheel/swipe arbitration while the panel is open).
 */

/**
 * Caption-overflow detection (D-31): the caption clamps to ~3-4 lines via
 * CSS line-height, not a character count (a character count would be wrong
 * at any other caption/viewport width). Overflow is true whenever the
 * caption's full rendered height exceeds its clamped visible height.
 */
export function isCaptionOverflowing(scrollHeight: number, clientHeight: number): boolean {
  return scrollHeight > clientHeight
}

/**
 * Three-stage Escape target (D-31 + D-37, Live-UAT Runde 2 extends Runde 1): the
 * highest-priority stage is the image zoom -- if zoomed, the first `Escape` resets only the
 * zoom level, regardless of the caption panel's state. Only once not zoomed does the
 * original two-stage sequence apply: the "Weiterlesen" panel first, then the viewer itself.
 */
export function resolveEscapeTarget(zoomed: boolean, panelOpen: boolean): 'zoom' | 'panel' | 'viewer' {
  if (zoomed) return 'zoom'
  return panelOpen ? 'panel' : 'viewer'
}

/**
 * Panel-reset value (D-31): the caption panel never carries its open state
 * over to a different image. The viewer shell's item-change effect calls
 * this on every navigation and assigns the result to its `panelOpen` state.
 */
export function resetCaptionPanelOpen(): boolean {
  return false
}

/**
 * Wheel/swipe arbitration while the caption panel may be open (D-31): a
 * wheel or swipe gesture belongs to the open panel's own text scrolling, not
 * to image navigation (D-29 wheel-navigation / D-03 touch-swipe), whenever
 * the panel is open.
 */
export function resolveWheelOrSwipeTarget(panelOpen: boolean): 'panel' | 'stage' {
  return panelOpen ? 'panel' : 'stage'
}
