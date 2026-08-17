'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

import { useNearViewportActivation } from '@/hooks/useNearViewportActivation'

import { Button } from './Button'
import { classNames } from './classNames'
import styles from './FocalCarousel.module.css'

const NAVIGATION_DURATION_MS = 210

export type FocalCarouselItemState = {
  active: boolean
  expanded: boolean
  position: number
  total: number
  showAll: () => void
}

type FocalCarouselProps<T> = {
  items: readonly T[]
  carouselItems?: readonly T[]
  getItemKey: (item: T) => string | number
  renderItem: (item: T, state: FocalCarouselItemState) => ReactNode
  regionLabel: string
  itemSingularLabel: string
  itemPluralLabel: string
  previousLabel: string
  nextLabel: string
  showAllLabel?: string
  showLessLabel?: string
  listLabel?: string
  carouselClassName?: string
  itemClassName?: string
  activeItemClassName?: string
  gridClassName?: string
  className?: string
  style?: CSSProperties
  showCounter?: boolean
  formatCounter?: (position: number, total: number, label: string) => ReactNode
  deferInteractionUntilNearViewport?: boolean
}

export function FocalCarousel<T>({
  items,
  carouselItems,
  getItemKey,
  renderItem,
  regionLabel,
  itemSingularLabel,
  itemPluralLabel,
  previousLabel,
  nextLabel,
  showAllLabel,
  showLessLabel = 'Weniger anzeigen',
  listLabel,
  carouselClassName,
  itemClassName,
  activeItemClassName,
  gridClassName,
  className,
  style,
  showCounter = false,
  formatCounter = (position, total, label) => `${position} von ${total} ${label}`,
  deferInteractionUntilNearViewport = false,
}: FocalCarouselProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const gridId = useId()
  const toggleId = `${gridId}-toggle`
  const activeIndexRef = useRef(0)
  const [expanded, setExpanded] = useState(false)
  const { targetRef: activationRef, interactionEnabled } = useNearViewportActivation<HTMLDivElement>(
    deferInteractionUntilNearViewport,
  )
  const trackRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef(false)
  const suppressClickRef = useRef(false)
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const programmaticAnimationFrameRef = useRef<number | null>(null)
  const programmaticAnimationTrackRef = useRef<HTMLDivElement | null>(null)
  const reducedMotionRef = useRef(false)
  const dragRef = useRef({ active: false, intent: 'pending', startX: 0, startY: 0, startScroll: 0, pointerId: -1, captured: false })

  const visibleItems = carouselItems ?? items
  const lastIndex = Math.max(0, visibleItems.length - 1)
  const safeIndex = Math.min(activeIndex, lastIndex)

  useEffect(() => {
    if (!expanded && restoreFocusRef.current) {
      restoreFocusRef.current = false
      const toggle = document.getElementById(toggleId)
      if (toggle) toggle.focus()
      else trackRef.current?.focus()
    }
  }, [expanded, toggleId])

  useEffect(() => () => {
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    cancelProgrammaticAnimation()
  }, [])

  useEffect(() => {
    if (!interactionEnabled) return
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reducedMotionRef.current = media.matches
      if (scrollSettleTimerRef.current) { clearTimeout(scrollSettleTimerRef.current); scrollSettleTimerRef.current = null }
      const wasAnimating = cancelProgrammaticAnimation()
      if (media.matches || wasAnimating) focusItem(nearestItemIndex(), false)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionEnabled])

  const itemElements = () =>
    Array.from(trackRef.current?.querySelectorAll<HTMLElement>('[data-focal-item]') ?? [])

  function cancelProgrammaticAnimation() {
    const frameId = programmaticAnimationFrameRef.current
    const wasAnimating = frameId !== null
    if (frameId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId)
    programmaticAnimationFrameRef.current = null
    programmaticAnimationTrackRef.current?.classList.remove(styles.programmaticScrolling)
    programmaticAnimationTrackRef.current = null
    return wasAnimating
  }

  function centeredScrollLeft(track: HTMLDivElement, element: HTMLElement) {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
    const trackRect = track.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const unclampedLeft = trackRect.width > 0 && elementRect.width > 0
      ? track.scrollLeft
        + elementRect.left + elementRect.width / 2
        - (trackRect.left + trackRect.width / 2)
      : element.offsetLeft + element.offsetWidth / 2 - track.clientWidth / 2
    return Math.max(0, Math.min(unclampedLeft, maxScroll))
  }

  const focusItem = (index: number, animate = true) => {
    const boundedIndex = Math.max(0, Math.min(index, lastIndex))
    const previousIndex = activeIndexRef.current
    activeIndexRef.current = boundedIndex
    setActiveIndex(boundedIndex)

    const track = trackRef.current
    const element = itemElements()[boundedIndex]
    if (!track || !element) return

    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = null
    cancelProgrammaticAnimation()

    const targetLeft = centeredScrollLeft(track, element)
    const startLeft = track.scrollLeft
    const adjacentTarget = Math.abs(boundedIndex - previousIndex) === 1
    const shouldAnimate = animate
      && adjacentTarget
      && !reducedMotionRef.current
      && Math.abs(targetLeft - startLeft) >= 1
      && typeof requestAnimationFrame === 'function'

    if (!shouldAnimate) {
      track.scrollTo?.({ left: targetLeft, behavior: 'auto' })
      if (typeof track.scrollTo !== 'function') track.scrollLeft = targetLeft
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
      cancelProgrammaticAnimation()
      track.scrollLeft = next
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
    if (!interactionEnabled) return
    if (event.target !== event.currentTarget) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      move(event.key === 'ArrowRight' ? 1 : -1)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusItem(event.key === 'Home' ? 0 : lastIndex)
    }
  }

  function nearestItemIndex() {
    const track = trackRef.current
    if (!track) return safeIndex
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
    const trackRect = track.getBoundingClientRect()
    const useLiveGeometry = trackRect.width > 0
    const center = useLiveGeometry
      ? trackRect.left + trackRect.width / 2
      : track.scrollLeft + track.clientWidth / 2
    let nearest = track.scrollLeft <= 1 ? 0 : track.scrollLeft >= maxScroll - 1 ? lastIndex : safeIndex
    let nearestDistance = Number.POSITIVE_INFINITY
    itemElements().forEach((element, index) => {
      const elementRect = element.getBoundingClientRect()
      const elementCenter = useLiveGeometry && elementRect.width > 0
        ? elementRect.left + elementRect.width / 2
        : element.offsetLeft + element.offsetWidth / 2
      const distance = Math.abs(elementCenter - center)
      if (distance < nearestDistance) {
        nearestDistance = distance
        if (track.scrollLeft > 1 && track.scrollLeft < maxScroll - 1) nearest = index
      }
    })
    return nearest
  }

  function scheduleScrollSettle() {
    setIsNavigating(true)
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = setTimeout(() => {
      scrollSettleTimerRef.current = null
      const physicalIndex = nearestItemIndex()
      activeIndexRef.current = physicalIndex
      setActiveIndex(physicalIndex)
      setIsNavigating(false)
    }, 120)
  }

  const handleScroll = () => {
    if (!interactionEnabled) return
    if (programmaticAnimationFrameRef.current !== null) return
    scheduleScrollSettle()
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactionEnabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const track = trackRef.current
    if (!track) return
    cancelProgrammaticAnimation()
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

  const handlePointerEnd = () => {
    if (!interactionEnabled) return
    if (!dragRef.current.active) return
    dragRef.current.active = false
    trackRef.current?.classList.remove(styles.dragging)
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = null
    focusItem(nearestItemIndex())
  }

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  if (items.length === 0) return null
  const quiet = visibleItems.length === 1

  if (expanded) {
    return (
      <div ref={activationRef} className={classNames(styles.root, className)} style={style}>
        <ul id={gridId} className={classNames(styles.grid, gridClassName)} aria-label={`Alle ${itemPluralLabel}`}>
          {items.map((item, index) => (
            <li key={getItemKey(item)} className={itemClassName}>
              {renderItem(item, {
                active: index === safeIndex,
                expanded: true,
                position: index + 1,
                total: items.length,
                showAll: () => setExpanded(true),
              })}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="subtle"
          size="sm"
          aria-expanded="true"
          aria-controls={gridId}
          onClick={() => {
            restoreFocusRef.current = true
            setExpanded(false)
          }}
        >
          {showLessLabel}
        </Button>
      </div>
    )
  }

  return (
    <div ref={activationRef} className={classNames(styles.root, className)} style={style}>
      <div className={classNames(styles.controls, quiet && styles.controlsQuiet)}>
        {!quiet ? <Button
          type="button"
          variant="ghost"
          iconOnly
          className={styles.arrow}
          aria-label={previousLabel}
          disabled={safeIndex === 0}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Button> : null}
        <div
          ref={trackRef}
          className={classNames(
            styles.track,
            interactionEnabled && styles.trackInteractive,
            quiet && styles.quietTrack,
            carouselClassName,
          )}
          role="region"
          aria-roledescription="Karussell"
          aria-label={regionLabel}
          data-orientation="horizontal"
          data-interaction-enabled={interactionEnabled ? 'true' : 'false'}
          data-navigation-state={isNavigating ? 'moving' : 'settled'}
          tabIndex={0}
          onKeyDown={interactionEnabled ? handleKeyDown : undefined}
          onScroll={interactionEnabled ? handleScroll : undefined}
          onPointerDown={interactionEnabled ? handlePointerDown : undefined}
          onPointerMove={interactionEnabled ? handlePointerMove : undefined}
          onPointerUp={interactionEnabled ? handlePointerEnd : undefined}
          onPointerCancel={interactionEnabled ? handlePointerEnd : undefined}
          onClickCapture={interactionEnabled ? handleClickCapture : undefined}
          onDragStart={interactionEnabled ? (event) => event.preventDefault() : undefined}
        >
          <div className={styles.items} role={listLabel ? 'list' : undefined} aria-label={listLabel}>
            {visibleItems.map((item, index) => {
              const isActive = index === safeIndex
              return (
                <div
                  key={getItemKey(item)}
                  data-focal-item
                  role={listLabel ? 'listitem' : undefined}
                  className={classNames(
                    styles.itemWindow,
                    itemClassName,
                    isActive && styles.itemWindowActive,
                    isActive && activeItemClassName,
                  )}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`${itemSingularLabel} ${index + 1} von ${visibleItems.length}`}
                  onClick={(event) => {
                    if (isActive || (event.target instanceof Element && event.target.closest('button, a, input, select, textarea'))) return
                    focusItem(index)
                  }}
                >
                  {renderItem(item, {
                    active: isActive,
                    expanded: false,
                    position: index + 1,
                    total: visibleItems.length,
                    showAll: () => setExpanded(true),
                  })}
                </div>
              )
            })}
          </div>
        </div>
        {!quiet ? <Button
          type="button"
          variant="ghost"
          iconOnly
          className={styles.arrow}
          aria-label={nextLabel}
          disabled={safeIndex === lastIndex}
          onClick={() => move(1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Button> : null}
      </div>
      {showCounter && !quiet ? (
        <output className={styles.counter} aria-live="polite">
          {formatCounter(safeIndex + 1, visibleItems.length, visibleItems.length === 1 ? itemSingularLabel : itemPluralLabel)}
        </output>
      ) : null}
      {showAllLabel && !quiet ? (
        <Button id={toggleId} type="button" variant="subtle" size="sm" className={styles.toggle} aria-expanded="false" aria-controls={gridId} onClick={() => setExpanded(true)}>
          {showAllLabel}
        </Button>
      ) : null}
    </div>
  )
}
