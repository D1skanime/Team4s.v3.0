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
  const gridId = useId()
  const toggleId = `${gridId}-toggle`
  const requestedScrollRef = useRef<{ index: number; left: number } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { targetRef: activationRef, interactionEnabled } = useNearViewportActivation<HTMLDivElement>(
    deferInteractionUntilNearViewport,
  )
  const trackRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef(false)
  const suppressClickRef = useRef(false)
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotionRef = useRef(false)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, pointerId: -1, captured: false, lastX: 0, lastTime: 0, velocity: 0 })

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
  }, [])

  useEffect(() => {
    if (!interactionEnabled) return
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reducedMotionRef.current = media.matches
      requestedScrollRef.current = null
      if (scrollSettleTimerRef.current) { clearTimeout(scrollSettleTimerRef.current); scrollSettleTimerRef.current = null }
      if (media.matches) focusItem(nearestItemIndex(), 'auto', false)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionEnabled])

  const itemElements = () =>
    Array.from(trackRef.current?.querySelectorAll<HTMLElement>('[data-focal-item]') ?? [])

  const focusItem = (index: number, behavior: ScrollBehavior = 'smooth', preserveTarget = true) => {
    const boundedIndex = Math.max(0, Math.min(index, lastIndex))
    setActiveIndex(boundedIndex)
    const track = trackRef.current
    const element = itemElements()[boundedIndex]
    if (track && element) {
      const left = Math.max(0, Math.min(element.offsetLeft + element.offsetWidth / 2 - track.clientWidth / 2, track.scrollWidth - track.clientWidth))
      if (preserveTarget) requestedScrollRef.current = { index: boundedIndex, left }
      track.scrollTo?.({ left, behavior })
    }
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
      requestedScrollRef.current = null
      track.scrollLeft = next
      setActiveIndex(nearestItemIndex())
    }
    track.addEventListener('wheel', handleWheel, { passive: false })
    return () => track.removeEventListener('wheel', handleWheel)
    // nearestItemIndex uses the same length-bound geometry captured by this listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, interactionEnabled, visibleItems.length])
  const move = (delta: number) => {
    if (!interactionEnabled) return
    focusItem(safeIndex + delta)
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
    const center = track.scrollLeft + track.clientWidth / 2
    let nearest = track.scrollLeft <= 1 ? 0 : track.scrollLeft >= maxScroll - 1 ? lastIndex : safeIndex
    let nearestDistance = Number.POSITIVE_INFINITY
    itemElements().forEach((element, index) => {
      const distance = Math.abs(element.offsetLeft + element.offsetWidth / 2 - center)
      const proximity = Math.max(0, Math.min(1, 1 - distance / Math.max(element.offsetWidth, 1)))
      element.style.setProperty('--focal-proximity', String(proximity))
      if (distance < nearestDistance) {
        nearestDistance = distance
        if (track.scrollLeft > 1 && track.scrollLeft < maxScroll - 1) nearest = index
      }
    })
    return nearest
  }

  const settleNearest = () => {
    focusItem(nearestItemIndex(), reducedMotionRef.current ? 'auto' : 'smooth', false)
  }

  const handleScroll = () => {
    if (!interactionEnabled) return
    const physicalIndex = nearestItemIndex()
    const track = trackRef.current
    const maxScroll = track ? Math.max(0, track.scrollWidth - track.clientWidth) : 0
    const atEndpoint = Boolean(track && (track.scrollLeft <= 1 || track.scrollLeft >= maxScroll - 1))
    if (!requestedScrollRef.current || atEndpoint) {
      requestedScrollRef.current = null
      setActiveIndex(physicalIndex)
    }
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = setTimeout(() => {
      scrollSettleTimerRef.current = null
      const requested = requestedScrollRef.current
      const track = trackRef.current
      if (requested && track) {
        setActiveIndex(requested.index)
        if (Math.abs(track.scrollLeft - requested.left) <= 1) {
          requestedScrollRef.current = null
        } else {
          track.scrollTo?.({ left: requested.left, behavior: 'auto' })
        }
        return
      }
      setActiveIndex(nearestItemIndex())
    }, 120)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactionEnabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const track = trackRef.current
    if (!track) return
    requestedScrollRef.current = null
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      pointerId: event.pointerId,
      captured: false,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactionEnabled) return
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag.active || !track) return
    const delta = event.clientX - drag.startX
    if (Math.abs(delta) <= 4) return
    suppressClickRef.current = true
    event.preventDefault()
    track.scrollLeft = drag.startScroll - delta
    setActiveIndex(nearestItemIndex())
    if (!drag.captured) {
    const elapsed = event.timeStamp - drag.lastTime
    if (elapsed > 0 && elapsed <= 120) {
      drag.velocity = (event.clientX - drag.lastX) / elapsed
      drag.lastX = event.clientX
      drag.lastTime = event.timeStamp
    }
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
    const track = trackRef.current
    if (track && !reducedMotionRef.current) {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
      track.scrollLeft = Math.max(0, Math.min(maxScroll, track.scrollLeft - dragRef.current.velocity * 240))
    }
    settleNearest()
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
            {visibleItems.map((item, index) => (
              <div
                key={getItemKey(item)}
                data-focal-item
                role={listLabel ? 'listitem' : undefined}
                className={classNames(
                  styles.itemWindow,
                  itemClassName,
                  index === safeIndex && styles.itemWindowActive,
                  index === safeIndex && activeItemClassName,
                )}
                aria-current={index === safeIndex ? 'true' : undefined}
                style={{ '--focal-proximity': index === safeIndex ? 1 : 0 } as CSSProperties}
                aria-label={`${itemSingularLabel} ${index + 1} von ${visibleItems.length}`}
              >
                {renderItem(item, {
                  active: index === safeIndex,
                  expanded: false,
                  position: index + 1,
                  total: visibleItems.length,
                  showAll: () => setExpanded(true),
                })}
              </div>
            ))}
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
