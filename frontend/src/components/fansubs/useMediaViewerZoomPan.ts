'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, MutableRefObject, TouchEvent as ReactTouchEvent } from 'react'

import { resolveWheelOrSwipeTarget } from '@/lib/mediaViewerCaptionPanel'
import {
  clampPanOffset,
  computeContainedSize,
  computeDragPanOffset,
  computeWheelZoomLevel,
  computeZoomAroundPointOffset,
  cycleZoomLevel,
  distanceBetweenPoints,
  isZoomed,
  midpointBetweenPoints,
  resolvePinchZoomLevel,
  resolveStageSwipeAction,
  resolveStageWheelAction,
  type PanOffset,
  type Point,
} from '@/lib/mediaViewerZoom'
import {
  computeSwipeNavigation,
  resolveWheelNavigation,
  shouldThrottleWheelNavigation,
} from '@/lib/mediaViewerNavigation'

// Ported verbatim from MediaViewerStage.tsx's pre-existing values (this hook is their new home).
const SWIPE_THRESHOLD = 32
const WHEEL_THROTTLE_MS = 500
// Wheel-zoom sensitivity (D-37): how many zoom levels one wheel "notch" (deltaY) covers.
const WHEEL_ZOOM_SENSITIVITY = 0.01

interface UseMediaViewerZoomPanParams {
  zoomLevel: number
  onZoomLevelChange: (level: number) => void
  resetKey: number | string
  captionPanelOpen: boolean
  onGestureNavigate: (direction: 'prev' | 'next') => void
}

interface UseMediaViewerZoomPanResult {
  containerRef: MutableRefObject<HTMLDivElement | null>
  imageRef: MutableRefObject<HTMLImageElement | null>
  pan: PanOffset
  zoomed: boolean
  onDoubleClick: () => void
  onMouseDown: (event: ReactMouseEvent<HTMLImageElement>) => void
  onTouchStart: (event: ReactTouchEvent<HTMLDivElement>) => void
  onTouchEnd: (event: ReactTouchEvent<HTMLDivElement>) => void
}

type PinchGesture = {
  startDistance: number
  startLevel: number
  startMidpoint: Point
  startPan: PanOffset
}

type DragGesture = {
  startPointerX: number
  startPointerY: number
  startPan: PanOffset
}

/**
 * Owns the unified media viewer's multi-level zoom-with-pan interaction surface (D-37,
 * Live-UAT Runde 2): double-click/wheel/mouse-drag/touch-drag/pinch gesture wiring. All
 * zoom/pan DECISIONS are delegated to the pure functions in `@/lib/mediaViewerZoom` --
 * this hook only owns the DOM refs, the `pan` state, and the event listeners that feed
 * those functions real measured numbers (container rect, natural image size, pointer/touch
 * coordinates).
 *
 * zoomLevel-echo mechanism: `zoomLevel` itself is LIFTED into `FansubMediaLightbox.tsx`
 * (mirroring `captionPanelOpen`), not owned here -- this hook only derives `zoomed` from it
 * and owns `pan`. Every gesture that changes the level from WITHIN this hook (double-click,
 * wheel-zoom, pinch) calls `onZoomLevelChange` AND sets `pan` to a matching, already-computed
 * value, AND records the level it just requested into `lastSyncedZoomLevelRef` -- all
 * synchronously, so React batches both state updates into one render. A separate effect keyed
 * on the `zoomLevel` PROP then compares the prop against that ref: if they match, this is just
 * React echoing back the exact change this hook itself just asked for, and the effect does
 * nothing (clearing it would clobber the carefully computed wheel/pinch pan with {0,0} and
 * cause a visible jump). If they differ, the change came from somewhere else entirely (the
 * top-bar magnifier button, the three-stage Escape handler, or the item-change reset -- all in
 * `FansubMediaLightbox.tsx`), so pan is reset to {0,0}. This is the same "self-authored echo,
 * ignore on match" idea already proven by `useWindowedEpisodePages.ts`'s `coreRef`
 * ref-mirroring pattern, applied here to answer "did I just cause this prop change, or did
 * someone else" instead of "is this callback's closure stale".
 */
export function useMediaViewerZoomPan({
  zoomLevel,
  onZoomLevelChange,
  resetKey,
  captionPanelOpen,
  onGestureNavigate,
}: UseMediaViewerZoomPanParams): UseMediaViewerZoomPanResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const lastSyncedZoomLevelRef = useRef(zoomLevel)
  const lastWheelAtRef = useRef<number | null>(null)
  const pinchRef = useRef<PinchGesture | null>(null)
  const dragRef = useRef<DragGesture | null>(null)
  const touchGestureRef = useRef<'none' | 'pinch' | 'pan'>('none')
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 })
  const zoomed = isZoomed(zoomLevel)

  // Externally-driven zoom-level changes (button/Escape/navigate) reset pan to zero; a change
  // this hook itself just requested (wheel/pinch/double-click, tracked via the ref above) is
  // left alone since it already carries its own correctly computed pan.
  useEffect(() => {
    if (lastSyncedZoomLevelRef.current === zoomLevel) return
    lastSyncedZoomLevelRef.current = zoomLevel
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPan({ x: 0, y: 0 })
  }, [zoomLevel])

  // Belt-and-suspenders: pan can never survive a navigation, independent of whether the echo
  // comparison above happens to line up.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPan({ x: 0, y: 0 })
  }, [resetKey])

  function getContentSize(level: number) {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) return null
    const rect = container.getBoundingClientRect()
    const fitted = computeContainedSize({
      containerWidth: rect.width,
      containerHeight: rect.height,
      naturalWidth: image.naturalWidth || rect.width,
      naturalHeight: image.naturalHeight || rect.height,
    })
    return {
      containerWidth: rect.width,
      containerHeight: rect.height,
      contentWidth: fitted.width * level,
      contentHeight: fitted.height * level,
    }
  }

  function onDoubleClick() {
    const next = cycleZoomLevel(zoomLevel)
    lastSyncedZoomLevelRef.current = next
    setPan({ x: 0, y: 0 })
    onZoomLevelChange(next)
  }

  function onMouseDown(event: ReactMouseEvent<HTMLImageElement>) {
    if (!zoomed) return
    event.preventDefault()
    dragRef.current = { startPointerX: event.clientX, startPointerY: event.clientY, startPan: pan }

    function handleMouseMove(moveEvent: globalThis.MouseEvent) {
      const gesture = dragRef.current
      if (!gesture) return
      const dragDeltaX = moveEvent.clientX - gesture.startPointerX
      const dragDeltaY = moveEvent.clientY - gesture.startPointerY
      const raw = computeDragPanOffset({
        previousOffsetX: gesture.startPan.x,
        previousOffsetY: gesture.startPan.y,
        dragDeltaX,
        dragDeltaY,
      })
      const size = getContentSize(zoomLevel)
      if (!size) return
      setPan(clampPanOffset({ ...size, offsetX: raw.x, offsetY: raw.y }))
    }

    function handleMouseUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function onTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (resolveWheelOrSwipeTarget(captionPanelOpen) === 'panel') return

    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]]
      const pointA: Point = { x: a.clientX, y: a.clientY }
      const pointB: Point = { x: b.clientX, y: b.clientY }
      pinchRef.current = {
        startDistance: distanceBetweenPoints(pointA, pointB),
        startLevel: zoomLevel,
        startMidpoint: midpointBetweenPoints(pointA, pointB),
        startPan: pan,
      }
      touchGestureRef.current = 'pinch'
      return
    }

    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    if (resolveStageSwipeAction(zoomed) === 'pan') {
      dragRef.current = { startPointerX: touch.clientX, startPointerY: touch.clientY, startPan: pan }
      touchGestureRef.current = 'pan'
    } else {
      touchGestureRef.current = 'none'
    }
  }

  function onTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const wasPinchOrPan = touchGestureRef.current !== 'none'
    pinchRef.current = null
    dragRef.current = null
    touchGestureRef.current = 'none'

    if (wasPinchOrPan) {
      touchStartRef.current = null
      return
    }

    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    if (!touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const direction = computeSwipeNavigation(deltaX, deltaY, SWIPE_THRESHOLD)
    if (direction) {
      onGestureNavigate(direction)
    }
  }

  // Native, non-passive wheel listener (not React's onWheel) so preventDefault() reliably
  // takes effect -- same pattern as FocalCarouselInternals.tsx's own wheel listener.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleWheel(event: WheelEvent) {
      if (resolveWheelOrSwipeTarget(captionPanelOpen) !== 'stage') return

      if (resolveStageWheelAction(zoomed) === 'navigate') {
        const direction = resolveWheelNavigation(event.deltaY)
        if (!direction) return
        if (shouldThrottleWheelNavigation(Date.now(), lastWheelAtRef.current, WHEEL_THROTTLE_MS)) return
        lastWheelAtRef.current = Date.now()
        event.preventDefault()
        onGestureNavigate(direction)
        return
      }

      const container2 = containerRef.current
      const image = imageRef.current
      if (!container2 || !image) return
      const rect = container2.getBoundingClientRect()
      const nextLevel = computeWheelZoomLevel(zoomLevel, event.deltaY, WHEEL_ZOOM_SENSITIVITY)
      const pointerOffsetX = event.clientX - (rect.left + rect.width / 2)
      const pointerOffsetY = event.clientY - (rect.top + rect.height / 2)
      const nextOffsetX = computeZoomAroundPointOffset({
        pointerOffsetFromCenter: pointerOffsetX,
        previousOffset: pan.x,
        previousLevel: zoomLevel,
        nextLevel,
      })
      const nextOffsetY = computeZoomAroundPointOffset({
        pointerOffsetFromCenter: pointerOffsetY,
        previousOffset: pan.y,
        previousLevel: zoomLevel,
        nextLevel,
      })
      const fitted = computeContainedSize({
        containerWidth: rect.width,
        containerHeight: rect.height,
        naturalWidth: image.naturalWidth || rect.width,
        naturalHeight: image.naturalHeight || rect.height,
      })
      const clamped = clampPanOffset({
        containerWidth: rect.width,
        containerHeight: rect.height,
        contentWidth: fitted.width * nextLevel,
        contentHeight: fitted.height * nextLevel,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      })
      event.preventDefault()
      lastSyncedZoomLevelRef.current = nextLevel
      setPan(clamped)
      onZoomLevelChange(nextLevel)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomLevel, zoomed, pan, captionPanelOpen, onGestureNavigate, onZoomLevelChange])

  // Native, non-passive touchmove listener: drives both the pinch-zoom and the single-finger
  // pan-while-zoomed branches. Plain at-fit single-touch swipe candidates are decided only at
  // onTouchEnd (computeSwipeNavigation), unchanged -- this listener does nothing for that case.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleTouchMove(event: TouchEvent) {
      const pinch = pinchRef.current
      if (pinch && event.touches.length === 2) {
        const [a, b] = [event.touches[0], event.touches[1]]
        const pointA: Point = { x: a.clientX, y: a.clientY }
        const pointB: Point = { x: b.clientX, y: b.clientY }
        const currentDistance = distanceBetweenPoints(pointA, pointB)
        const currentMidpoint = midpointBetweenPoints(pointA, pointB)
        const nextLevel = resolvePinchZoomLevel(pinch.startLevel, pinch.startDistance, currentDistance)

        const container2 = containerRef.current
        const image = imageRef.current
        if (!container2 || !image) return
        const rect = container2.getBoundingClientRect()
        const pointerOffsetX = currentMidpoint.x - (rect.left + rect.width / 2)
        const pointerOffsetY = currentMidpoint.y - (rect.top + rect.height / 2)
        const nextOffsetX = computeZoomAroundPointOffset({
          pointerOffsetFromCenter: pointerOffsetX,
          previousOffset: pinch.startPan.x,
          previousLevel: pinch.startLevel,
          nextLevel,
        })
        const nextOffsetY = computeZoomAroundPointOffset({
          pointerOffsetFromCenter: pointerOffsetY,
          previousOffset: pinch.startPan.y,
          previousLevel: pinch.startLevel,
          nextLevel,
        })
        const fitted = computeContainedSize({
          containerWidth: rect.width,
          containerHeight: rect.height,
          naturalWidth: image.naturalWidth || rect.width,
          naturalHeight: image.naturalHeight || rect.height,
        })
        const clamped = clampPanOffset({
          containerWidth: rect.width,
          containerHeight: rect.height,
          contentWidth: fitted.width * nextLevel,
          contentHeight: fitted.height * nextLevel,
          offsetX: nextOffsetX,
          offsetY: nextOffsetY,
        })
        event.preventDefault()
        lastSyncedZoomLevelRef.current = nextLevel
        setPan(clamped)
        onZoomLevelChange(nextLevel)
        return
      }

      const drag = dragRef.current
      if (drag && touchGestureRef.current === 'pan') {
        const touch = event.touches[0]
        if (!touch) return
        const dragDeltaX = touch.clientX - drag.startPointerX
        const dragDeltaY = touch.clientY - drag.startPointerY
        const raw = computeDragPanOffset({
          previousOffsetX: drag.startPan.x,
          previousOffsetY: drag.startPan.y,
          dragDeltaX,
          dragDeltaY,
        })
        const size = getContentSize(zoomLevel)
        if (!size) return
        event.preventDefault()
        setPan(clampPanOffset({ ...size, offsetX: raw.x, offsetY: raw.y }))
      }
    }

    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => container.removeEventListener('touchmove', handleTouchMove)
  }, [zoomLevel, zoomed, pan, captionPanelOpen, onGestureNavigate, onZoomLevelChange])

  return { containerRef, imageRef, pan, zoomed, onDoubleClick, onMouseDown, onTouchStart, onTouchEnd }
}
