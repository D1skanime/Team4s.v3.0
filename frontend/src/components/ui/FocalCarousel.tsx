'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import { useNearViewportActivation } from '@/hooks/useNearViewportActivation'

import styles from './FocalCarousel.module.css'
import {
  centeredScrollLeft,
  CollapsedCarousel,
  consumeSuppressedClick,
  directItemElements,
  nearestOwnedItemIndex,
  ownedItemClickHandler,
  positionOwnedItem,
  ExpandedCarousel,
  type CollapsedTrackHandlers,
  type FocalCarouselProps,
} from './FocalCarouselInternals'

export type { FocalCarouselItemState } from './FocalCarouselInternals'

const NAVIGATION_DURATION_MS = 210

export function FocalCarousel<T>(props: FocalCarouselProps<T>) {
  const {
    items,
    carouselItems,
    showLessLabel = 'Weniger anzeigen',
    deferInteractionUntilNearViewport = false,
  } = props
  const [activeIndex, setActiveIndex] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const gridId = useId()
  const toggleId = `${gridId}-toggle`
  const collapseId = `${gridId}-collapse`
  const activeIndexRef = useRef(0)
  const [expanded, setExpanded] = useState(false)
  const { targetRef: activationRef, interactionEnabled } =
    useNearViewportActivation<HTMLDivElement>(deferInteractionUntilNearViewport)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef(false)
  const expandFocusRef = useRef(false)
  const suppressClickRef = useRef(false)
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollMeasurementFrameRef = useRef<number | null>(null)
  const programmaticAnimationFrameRef = useRef<number | null>(null)
  const programmaticAnimationTrackRef = useRef<HTMLDivElement | null>(null)
  const reducedMotionRef = useRef(false)
  const focusItemRef = useRef<(index: number) => void>(() => {})
  const cancelPendingInteractionRef = useRef<(updateNavigationState?: boolean) => boolean>(
    () => false,
  )
  const dragRef = useRef({
    active: false,
    intent: 'pending',
    startX: 0,
    startY: 0,
    startScroll: 0,
    pointerId: -1,
    captured: false,
  })

  const visibleItems = carouselItems ?? items
  const [renderedItemCount, setRenderedItemCount] = useState(visibleItems.length)
  const lastIndex = Math.max(0, visibleItems.length - 1)
  const safeIndex = Math.min(activeIndex, lastIndex)
  if (renderedItemCount !== visibleItems.length) {
    setRenderedItemCount(visibleItems.length)
    activeIndexRef.current = safeIndex
    if (activeIndex !== safeIndex) setActiveIndex(safeIndex)
    if (isNavigating) setIsNavigating(false)
  }
  const showAll = useCallback(() => {
    cancelPendingInteractionRef.current()
    expandFocusRef.current = true
    setExpanded(true)
  }, [])

  const setTrackElement = useCallback(
    (track: HTMLDivElement | null) => {
      trackRef.current = track
      cancelPendingInteractionRef.current(false)
      if (!track) return
      positionOwnedItem(track, Math.min(activeIndexRef.current, Math.max(0, renderedItemCount - 1)))
    },
    [renderedItemCount],
  )

  useEffect(() => {
    if (expanded || !restoreFocusRef.current) return
    restoreFocusRef.current = false
    const toggle = document.getElementById(toggleId)
    if (toggle) toggle.focus()
    else trackRef.current?.focus()
  }, [expanded, toggleId])

  useEffect(() => {
    if (expanded && expandFocusRef.current) {
      expandFocusRef.current = false
      document.getElementById(collapseId)?.focus()
    }
  }, [expanded, collapseId])

  useEffect(
    () => () => {
      cancelPendingInteraction(false)
    },
    // Cleanup reads mutable work refs only and must remain bound to this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (!interactionEnabled || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reducedMotionRef.current = media.matches
      const wasAnimating = cancelPendingInteraction()
      if (media.matches || wasAnimating) focusItem(nearestItemIndex(), false)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionEnabled])

  function cancelProgrammaticAnimation() {
    const frameId = programmaticAnimationFrameRef.current
    const wasAnimating = frameId !== null
    if (frameId !== null && typeof cancelAnimationFrame === 'function')
      cancelAnimationFrame(frameId)
    programmaticAnimationFrameRef.current = null
    programmaticAnimationTrackRef.current?.classList.remove(styles.programmaticScrolling)
    programmaticAnimationTrackRef.current = null
    return wasAnimating
  }

  function cancelPendingInteraction(updateNavigationState = true) {
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = null
    if (scrollMeasurementFrameRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(scrollMeasurementFrameRef.current)
    }
    scrollMeasurementFrameRef.current = null
    const wasAnimating = cancelProgrammaticAnimation()
    if (updateNavigationState) setIsNavigating(false)
    return wasAnimating
  }
  cancelPendingInteractionRef.current = cancelPendingInteraction

  const focusItem = (index: number, animate = true) => {
    const boundedIndex = Math.max(0, Math.min(index, lastIndex))
    const previousIndex = activeIndexRef.current
    activeIndexRef.current = boundedIndex
    setActiveIndex(boundedIndex)

    const track = trackRef.current
    const element = directItemElements(track)[boundedIndex]
    if (!track || !element) return

    cancelPendingInteraction()

    const targetLeft = centeredScrollLeft(track, element)
    const startLeft = track.scrollLeft
    const adjacentTarget = Math.abs(boundedIndex - previousIndex) === 1
    const shouldAnimate =
      animate &&
      adjacentTarget &&
      !reducedMotionRef.current &&
      Math.abs(targetLeft - startLeft) >= 1 &&
      typeof requestAnimationFrame === 'function'

    if (!shouldAnimate) {
      positionOwnedItem(track, boundedIndex)
      setIsNavigating(false)
      return
    }

    setIsNavigating(true)
    programmaticAnimationTrackRef.current = track
    track.classList.add(styles.programmaticScrolling)
    let startTime: number | null = null
    const step = (time: number) => {
      if (startTime === null) startTime = time
      const progress = Math.min(1, (time - startTime) / NAVIGATION_DURATION_MS)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      track.scrollLeft = startLeft + (targetLeft - startLeft) * easedProgress
      if (progress < 1) {
        programmaticAnimationFrameRef.current = requestAnimationFrame(step)
        return
      }
      track.scrollLeft = targetLeft
      programmaticAnimationFrameRef.current = null
      track.classList.remove(styles.programmaticScrolling)
      programmaticAnimationTrackRef.current = null
      setIsNavigating(false)
    }
    programmaticAnimationFrameRef.current = requestAnimationFrame(step)
  }
  focusItemRef.current = focusItem

  useEffect(() => {
    const track = trackRef.current
    if (!interactionEnabled || !track || expanded) return
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      const delta = event.deltaX
      if (!delta) return
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
      const next = Math.max(0, Math.min(maxScroll, track.scrollLeft + delta))
      if (next === track.scrollLeft) return
      event.preventDefault()
      cancelPendingInteraction()
      track.scrollLeft = next
      scheduleScrollMeasurement()
      scheduleScrollSettle()
    }
    track.addEventListener('wheel', handleWheel, { passive: false })
    return () => track.removeEventListener('wheel', handleWheel)
    // nearestItemIndex uses the same length-bound geometry captured by this listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, interactionEnabled, visibleItems.length])
  const move = (delta: number) => {
    if (!interactionEnabled) return
    focusItem(activeIndexRef.current + delta)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactionEnabled || event.target !== event.currentTarget) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      move(event.key === 'ArrowRight' ? 1 : -1)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusItem(event.key === 'Home' ? 0 : lastIndex)
    }
  }

  const nearestItemIndex = () =>
    nearestOwnedItemIndex(trackRef.current, activeIndexRef.current, lastIndex)

  function updateActiveFromGeometry() {
    const physicalIndex = nearestItemIndex()
    if (physicalIndex === activeIndexRef.current) return
    activeIndexRef.current = physicalIndex
    setActiveIndex(physicalIndex)
  }

  function scheduleScrollMeasurement() {
    if (scrollMeasurementFrameRef.current !== null) return
    if (typeof requestAnimationFrame !== 'function') {
      updateActiveFromGeometry()
      return
    }
    scrollMeasurementFrameRef.current = requestAnimationFrame(() => {
      scrollMeasurementFrameRef.current = null
      updateActiveFromGeometry()
    })
  }

  function scheduleScrollSettle() {
    setIsNavigating(true)
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = setTimeout(() => {
      scrollSettleTimerRef.current = null
      if (
        scrollMeasurementFrameRef.current !== null &&
        typeof cancelAnimationFrame === 'function'
      ) {
        cancelAnimationFrame(scrollMeasurementFrameRef.current)
      }
      scrollMeasurementFrameRef.current = null
      updateActiveFromGeometry()
      setIsNavigating(false)
    }, 120)
  }

  const handleScroll = () => {
    if (!interactionEnabled || programmaticAnimationFrameRef.current !== null) return
    scheduleScrollMeasurement()
    scheduleScrollSettle()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactionEnabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    const track = trackRef.current
    if (!track) return
    cancelPendingInteraction()
    suppressClickRef.current = false
    updateActiveFromGeometry()
    dragRef.current = {
      active: true,
      intent: 'pending',
      startX: event.clientX,
      startY: event.clientY,
      startScroll: track.scrollLeft,
      pointerId: event.pointerId,
      captured: false,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactionEnabled) return
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag.active || !track) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (drag.intent === 'pending') {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) <= 6) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        drag.intent = 'vertical'
        drag.active = false
        return
      }
      drag.intent = 'horizontal'
    }
    if (drag.intent !== 'horizontal') return
    suppressClickRef.current = true
    event.preventDefault()
    setIsNavigating(true)
    track.scrollLeft = drag.startScroll - deltaX
    scheduleScrollMeasurement()
    if (!drag.captured) {
      drag.captured = true
      track.classList.add(styles.dragging)
      try {
        track.setPointerCapture(drag.pointerId)
      } catch {
        // The pointer may already have been released by the browser.
      }
    }
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.type === 'pointercancel') suppressClickRef.current = false
    if (!interactionEnabled || !dragRef.current.active) return
    dragRef.current.active = false
    trackRef.current?.classList.remove(styles.dragging)
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = null
    focusItem(nearestItemIndex())
  }

  if (items.length === 0) return null
  const quiet = visibleItems.length === 1
  const collapsedTrackHandlers: CollapsedTrackHandlers = {
    onKeyDown: handleKeyDown,
    onScroll: handleScroll,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onClickCapture: (event) => consumeSuppressedClick(event, suppressClickRef),
    onClick: ownedItemClickHandler(activeIndexRef, focusItemRef),
    onDragStart: (event) => event.preventDefault(),
  }

  if (expanded)
    return (
      <ExpandedCarousel
        {...props}
        activationRef={activationRef}
        gridId={gridId}
        collapseId={collapseId}
        activeIndex={safeIndex}
        showAll={showAll}
        showLessLabel={showLessLabel}
        onCollapse={() => {
          restoreFocusRef.current = true
          setExpanded(false)
        }}
      />
    )

  return (
    <CollapsedCarousel
      {...props}
      items={visibleItems}
      activationRef={activationRef}
      trackRef={setTrackElement}
      gridId={gridId}
      toggleId={toggleId}
      activeIndex={safeIndex}
      lastIndex={lastIndex}
      quiet={quiet}
      interactionEnabled={interactionEnabled}
      isNavigating={isNavigating}
      showAll={showAll}
      onPrevious={() => move(-1)}
      onNext={() => move(1)}
      trackHandlers={collapsedTrackHandlers}
    />
  )
}
