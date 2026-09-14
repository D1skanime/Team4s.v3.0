'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  memo,
  type CSSProperties,
  type DragEventHandler,
  type KeyboardEventHandler,
  type MouseEvent,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
  type Ref,
  type UIEventHandler,
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

export type FocalCarouselProps<T> = {
  items: readonly T[]
  carouselItems?: readonly T[]
  /** Full-width cards with navigation below; focal keeps neighboring previews. */
  presentation?: 'focal' | 'full-width'
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

type DirectCarouselItemProps<T> = {
  item: T
  index: number
  total: number
  active: boolean
  listItem: boolean
  itemSingularLabel: string
  itemClassName?: string
  activeItemClassName?: string
  renderItem: (item: T, state: FocalCarouselItemState) => ReactNode
  showAll: () => void
}

function DirectCarouselItemInner<T>({
  item,
  index,
  total,
  active,
  listItem,
  itemSingularLabel,
  itemClassName,
  activeItemClassName,
  renderItem,
  showAll,
}: DirectCarouselItemProps<T>) {
  return (
    <div
      data-focal-item
      data-focal-carousel-item
      role={listItem ? 'listitem' : undefined}
      className={classNames(
        styles.itemWindow,
        itemClassName,
        active && styles.itemWindowActive,
        active && activeItemClassName,
      )}
      aria-current={active ? 'true' : undefined}
      aria-label={`${itemSingularLabel} ${index + 1} von ${total}`}
      ref={(node) => {
        // react-dom@18.3 does not recognize `inert` as a boolean DOM property (it
        // was only added in a later React major), so set it through the DOM API.
        if (!node) return
        if (active) node.removeAttribute('inert')
        else node.setAttribute('inert', '')
      }}
    >
      {renderItem(item, {
        active,
        expanded: false,
        position: index + 1,
        total,
        showAll,
      })}
    </div>
  )
}

const DirectCarouselItem = memo(DirectCarouselItemInner) as typeof DirectCarouselItemInner

export function directItemElements(track: HTMLDivElement | null) {
  if (!track) return []
  const itemTrack = Array.from(track.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute('data-focal-carousel-items'),
  )
  if (!itemTrack) return []
  return Array.from(itemTrack.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute('data-focal-carousel-item'),
  )
}

function ownedItemIndexAtPoint(track: HTMLDivElement, x: number, y: number) {
  return directItemElements(track).findIndex((element) => {
    const rect = element.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  })
}

export function ownedItemClickHandler(
  activeIndex: { current: number },
  selectItem: { current: (index: number) => void },
) {
  return (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest('button, a, input, select, textarea')
    )
      return
    const index = ownedItemIndexAtPoint(event.currentTarget, event.clientX, event.clientY)
    if (index >= 0 && index !== activeIndex.current) selectItem.current(index)
  }
}

export function centeredScrollLeft(track: HTMLDivElement, element: HTMLElement) {
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
  const trackRect = track.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const unclampedLeft =
    trackRect.width > 0 && elementRect.width > 0
      ? track.scrollLeft +
        elementRect.left +
        elementRect.width / 2 -
        (trackRect.left + trackRect.width / 2)
      : element.offsetLeft + element.offsetWidth / 2 - track.clientWidth / 2
  return Math.max(0, Math.min(unclampedLeft, maxScroll))
}

export function positionOwnedItem(track: HTMLDivElement | null, index: number) {
  if (!track) return
  const element = directItemElements(track)[index]
  if (!element) return
  const left = centeredScrollLeft(track, element)
  track.scrollTo?.({ left, behavior: 'auto' })
  if (typeof track.scrollTo !== 'function') track.scrollLeft = left
}

export function nearestOwnedItemIndex(
  track: HTMLDivElement | null,
  activeIndex: number,
  lastIndex: number,
) {
  if (!track) return Math.min(activeIndex, lastIndex)
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
  const trackRect = track.getBoundingClientRect()
  const useLiveGeometry = trackRect.width > 0
  const center = useLiveGeometry
    ? trackRect.left + trackRect.width / 2
    : track.scrollLeft + track.clientWidth / 2
  let nearest =
    track.scrollLeft <= 1
      ? 0
      : track.scrollLeft >= maxScroll - 1
        ? lastIndex
        : Math.min(activeIndex, lastIndex)
  let nearestDistance = Number.POSITIVE_INFINITY
  directItemElements(track).forEach((element, index) => {
    const elementRect = element.getBoundingClientRect()
    const elementCenter =
      useLiveGeometry && elementRect.width > 0
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

type ExpandedCarouselProps<T> = FocalCarouselProps<T> & {
  activationRef: Ref<HTMLDivElement>
  gridId: string
  collapseId: string
  activeIndex: number
  showAll: () => void
  onCollapse: () => void
}

export type CollapsedTrackHandlers = {
  onKeyDown: KeyboardEventHandler<HTMLDivElement>
  onScroll: UIEventHandler<HTMLDivElement>
  onPointerDown: PointerEventHandler<HTMLDivElement>
  onPointerMove: PointerEventHandler<HTMLDivElement>
  onPointerUp: PointerEventHandler<HTMLDivElement>
  onPointerCancel: PointerEventHandler<HTMLDivElement>
  onClickCapture: MouseEventHandler<HTMLDivElement>
  onClick: MouseEventHandler<HTMLDivElement>
  onDragStart: DragEventHandler<HTMLDivElement>
}

type CollapsedCarouselProps<T> = FocalCarouselProps<T> & {
  activationRef: Ref<HTMLDivElement>
  trackRef: Ref<HTMLDivElement>
  gridId: string
  toggleId: string
  activeIndex: number
  lastIndex: number
  quiet: boolean
  interactionEnabled: boolean
  isNavigating: boolean
  showAll: () => void
  onPrevious: () => void
  onNext: () => void
  trackHandlers: CollapsedTrackHandlers
}

export function CollapsedCarousel<T>({
  items,
  getItemKey,
  renderItem,
  regionLabel,
  itemSingularLabel,
  itemPluralLabel,
  previousLabel,
  nextLabel,
  showAllLabel,
  listLabel,
  carouselClassName,
  itemClassName,
  activeItemClassName,
  className,
  style,
  showCounter = false,
  formatCounter = (position, total, label) => `${position} von ${total} ${label}`,
  activationRef,
  trackRef,
  gridId,
  toggleId,
  activeIndex,
  lastIndex,
  quiet,
  presentation = 'focal',
  interactionEnabled,
  isNavigating,
  showAll,
  onPrevious,
  onNext,
  trackHandlers,
}: CollapsedCarouselProps<T>) {
  return (
    <div
      ref={activationRef}
      className={classNames(styles.root, presentation === 'full-width' && styles.fullWidth, className)}
      style={style}
    >
      <div className={classNames(styles.controls, quiet && styles.controlsQuiet)}>
        {!quiet ? (
          <CarouselArrow
            direction="previous"
            label={previousLabel}
            disabled={activeIndex === 0}
            onClick={onPrevious}
          />
        ) : null}
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
          {...(interactionEnabled ? trackHandlers : {})}
        >
          <div
            className={styles.items}
            role={listLabel ? 'list' : undefined}
            aria-label={listLabel}
            data-focal-carousel-items
          >
            {items.map((item, index) => (
              <DirectCarouselItem
                key={getItemKey(item)}
                item={item}
                index={index}
                total={items.length}
                active={index === activeIndex}
                listItem={Boolean(listLabel)}
                itemSingularLabel={itemSingularLabel}
                itemClassName={itemClassName}
                activeItemClassName={activeItemClassName}
                renderItem={renderItem}
                showAll={showAll}
              />
            ))}
          </div>
        </div>
        {!quiet ? (
          <CarouselArrow
            direction="next"
            label={nextLabel}
            disabled={activeIndex === lastIndex}
            onClick={onNext}
          />
        ) : null}
      </div>
      {showCounter && !quiet ? (
        <output className={styles.counter} aria-live="polite">
          {formatCounter(
            activeIndex + 1,
            items.length,
            items.length === 1 ? itemSingularLabel : itemPluralLabel,
          )}
        </output>
      ) : null}
      {showAllLabel && !quiet ? (
        <Button
          id={toggleId}
          type="button"
          variant="subtle"
          size="sm"
          className={styles.toggle}
          aria-expanded="false"
          aria-controls={gridId}
          onClick={showAll}
        >
          {showAllLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function ExpandedCarousel<T>({
  items,
  getItemKey,
  renderItem,
  itemPluralLabel,
  itemClassName,
  gridClassName,
  className,
  style,
  showLessLabel,
  activationRef,
  gridId,
  collapseId,
  activeIndex,
  showAll,
  onCollapse,
}: ExpandedCarouselProps<T>) {
  return (
    <div ref={activationRef} className={classNames(styles.root, className)} style={style}>
      <ul
        id={gridId}
        className={classNames(styles.grid, gridClassName)}
        aria-label={`Alle ${itemPluralLabel}`}
      >
        {items.map((item, index) => (
          <li key={getItemKey(item)} className={itemClassName}>
            {renderItem(item, {
              active: index === activeIndex,
              expanded: true,
              position: index + 1,
              total: items.length,
              showAll,
            })}
          </li>
        ))}
      </ul>
      <Button
        id={collapseId}
        type="button"
        variant="subtle"
        size="sm"
        aria-expanded="true"
        aria-controls={gridId}
        onClick={onCollapse}
      >
        {showLessLabel}
      </Button>
    </div>
  )
}

export function consumeSuppressedClick(
  event: MouseEvent<HTMLDivElement>,
  suppressed: { current: boolean },
) {
  if (!suppressed.current) return
  event.preventDefault()
  event.stopPropagation()
  suppressed.current = false
}

type CarouselArrowProps = {
  direction: 'previous' | 'next'
  label: string
  disabled: boolean
  onClick: () => void
}

function CarouselArrow({ direction, label, disabled, onClick }: CarouselArrowProps) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  return (
    <Button
      type="button"
      variant="ghost"
      iconOnly
      className={styles.arrow}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={18} aria-hidden="true" />
    </Button>
  )
}
