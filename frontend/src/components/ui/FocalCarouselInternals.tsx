'use client'

import { memo, type MouseEvent, type CSSProperties, type ReactNode, type Ref } from 'react'

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
  onSelect: (index: number) => void
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
  onSelect,
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
      onClick={(event) => {
        if (active || (event.target instanceof Element && event.target.closest('button, a, input, select, textarea'))) return
        onSelect(index)
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

export const DirectCarouselItem = memo(DirectCarouselItemInner) as typeof DirectCarouselItemInner


export function directItemElements(track: HTMLDivElement | null) {
  if (!track) return []
  const itemTrack = Array.from(track.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.hasAttribute('data-focal-carousel-items'),
  )
  if (!itemTrack) return []
  return Array.from(itemTrack.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.hasAttribute('data-focal-carousel-item'),
  )
}

export function centeredScrollLeft(track: HTMLDivElement, element: HTMLElement) {
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

export function nearestOwnedItemIndex(track: HTMLDivElement | null, activeIndex: number, lastIndex: number) {
  if (!track) return Math.min(activeIndex, lastIndex)
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
  const trackRect = track.getBoundingClientRect()
  const useLiveGeometry = trackRect.width > 0
  const center = useLiveGeometry
    ? trackRect.left + trackRect.width / 2
    : track.scrollLeft + track.clientWidth / 2
  let nearest = track.scrollLeft <= 1
    ? 0
    : track.scrollLeft >= maxScroll - 1
      ? lastIndex
      : Math.min(activeIndex, lastIndex)
  let nearestDistance = Number.POSITIVE_INFINITY
  directItemElements(track).forEach((element, index) => {
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

type ExpandedCarouselProps<T> = FocalCarouselProps<T> & {
  activationRef: Ref<HTMLDivElement>
  gridId: string
  collapseId: string
  activeIndex: number
  showAll: () => void
  onCollapse: () => void
}

export function ExpandedCarousel<T>({
  items, getItemKey, renderItem, itemPluralLabel, itemClassName, gridClassName,
  className, style, showLessLabel, activationRef, gridId, collapseId, activeIndex,
  showAll, onCollapse,
}: ExpandedCarouselProps<T>) {
  return (
    <div ref={activationRef} className={classNames(styles.root, className)} style={style}>
      <ul id={gridId} className={classNames(styles.grid, gridClassName)} aria-label={`Alle ${itemPluralLabel}`}>
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

export function consumeSuppressedClick(event: MouseEvent<HTMLDivElement>, suppressed: { current: boolean }) {
  if (!suppressed.current) return
  event.preventDefault()
  event.stopPropagation()
  suppressed.current = false
}
