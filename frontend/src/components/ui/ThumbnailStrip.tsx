'use client'

import { useEffect, useRef } from 'react'

import { centeredScrollLeft, directItemElements } from './FocalCarouselInternals'
import { classNames } from './classNames'
import { ResponsiveImage } from './ResponsiveImage'
import styles from './ThumbnailStrip.module.css'

export interface ThumbnailStripItem {
  key: string | number
  thumbnailUrl: string
}

export interface ThumbnailStripProps {
  items: readonly ThumbnailStripItem[]
  activeIndex: number
  onSelect: (index: number) => void
  regionLabel: string
}

/**
 * Volle-Breite Thumbnail-Leiste unterhalb der Bild-Bühne (Phase 177 Gap-Fix, D-28). Neues
 * globales Primitive (D-11) statt feature-lokalem Bau; wiederverwendet centeredScrollLeft/
 * directItemElements aus FocalCarouselInternals.tsx fuer das Auto-Scroll-Verhalten, statt die
 * Scroll-Zentrierungs-Mathematik erneut zu bauen. Rendert nichts bei weniger als zwei Bildern
 * (D-32).
 */
export function ThumbnailStrip({ items, activeIndex, onSelect, regionLabel }: ThumbnailStripProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const element = directItemElements(track)[activeIndex]
    if (!element) return
    const left = centeredScrollLeft(track, element)
    if (typeof track.scrollTo === 'function') track.scrollTo({ left, behavior: 'smooth' })
    else track.scrollLeft = left
  }, [activeIndex])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    function handleWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      track!.scrollLeft += event.deltaY
    }
    track.addEventListener('wheel', handleWheel, { passive: false })
    return () => track.removeEventListener('wheel', handleWheel)
  }, [])

  if (items.length < 2) return null

  return (
    <div className={styles.strip}>
      <div ref={trackRef} className={styles.track} role="region" aria-label={regionLabel}>
        <div className={styles.items} data-focal-carousel-items>
          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              data-focal-carousel-item
              className={classNames(styles.thumb, index === activeIndex && styles.thumbActive)}
              aria-label={`Bild ${index + 1} von ${items.length} anzeigen`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => onSelect(index)}
            >
              <ResponsiveImage src={item.thumbnailUrl} alt="" fill sizes="96px" className={styles.thumbImage} />
            </button>
          ))}
        </div>
      </div>
      <span className={styles.counter}>
        {activeIndex + 1} / {items.length}
      </span>
    </div>
  )
}
