'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

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
}: FocalCarouselProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef(false)
  const suppressClickRef = useRef(false)
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, pointerId: -1, captured: false })

  const visibleItems = carouselItems ?? items
  const lastIndex = Math.max(0, visibleItems.length - 1)
  const safeIndex = Math.min(activeIndex, lastIndex)

  useEffect(() => {
    if (!expanded && restoreFocusRef.current) {
      restoreFocusRef.current = false
      trackRef.current?.focus()
    }
  }, [expanded])

  useEffect(() => () => {
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
  }, [])

  const itemElements = () =>
    Array.from(trackRef.current?.querySelectorAll<HTMLElement>('[data-focal-item]') ?? [])

  const focusItem = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const boundedIndex = Math.max(0, Math.min(index, lastIndex))
    setActiveIndex(boundedIndex)
    const element = itemElements()[boundedIndex]
    element?.scrollIntoView?.({ behavior, block: 'nearest', inline: 'center' })
  }

  const move = (delta: number) => focusItem(safeIndex + delta)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      move(event.key === 'ArrowRight' ? 1 : -1)
    }
  }

  const nearestItemIndex = () => {
    const track = trackRef.current
    if (!track) return safeIndex
    const center = track.getBoundingClientRect().left + track.clientWidth / 2
    const elements = itemElements()
    let nearest = safeIndex
    let nearestDistance = Number.POSITIVE_INFINITY
    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect()
      const distance = Math.abs(rect.left + rect.width / 2 - center)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = index
      }
    })
    return nearest
  }

  const settleNearest = () => {
    focusItem(nearestItemIndex())
  }

  const handleScroll = () => {
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = setTimeout(() => {
      scrollSettleTimerRef.current = null
      setActiveIndex(nearestItemIndex())
    }, 120)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const track = trackRef.current
    if (!track) return
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      pointerId: event.pointerId,
      captured: false,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag.active || !track) return
    const delta = event.clientX - drag.startX
    if (Math.abs(delta) <= 4) return
    suppressClickRef.current = true
    event.preventDefault()
    track.scrollLeft = drag.startScroll - delta
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
    if (!dragRef.current.active) return
    dragRef.current.active = false
    trackRef.current?.classList.remove(styles.dragging)
    if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = null
    settleNearest()
  }

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  if (items.length === 0) return null

  if (expanded) {
    return (
      <div className={classNames(styles.root, className)} style={style}>
        <ul className={classNames(styles.grid, gridClassName)} aria-label={`Alle ${itemPluralLabel}`}>
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
    <div className={classNames(styles.root, className)} style={style}>
      <div className={styles.controls}>
        <Button
          type="button"
          variant="ghost"
          iconOnly
          className={styles.arrow}
          aria-label={previousLabel}
          disabled={safeIndex === 0}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        <div
          ref={trackRef}
          className={classNames(styles.track, carouselClassName)}
          role="region"
          aria-roledescription="Karussell"
          aria-label={regionLabel}
          data-orientation="horizontal"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onClickCapture={handleClickCapture}
          onDragStart={(event) => event.preventDefault()}
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
        <Button
          type="button"
          variant="ghost"
          iconOnly
          className={styles.arrow}
          aria-label={nextLabel}
          disabled={safeIndex === lastIndex}
          onClick={() => move(1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>
      {showAllLabel ? (
        <Button type="button" variant="subtle" size="sm" className={styles.toggle} onClick={() => setExpanded(true)}>
          {showAllLabel}
        </Button>
      ) : null}
    </div>
  )
}
