'use client'

import { useEffect, useRef } from 'react'

import { centeredScrollLeft, directItemElements } from './FocalCarouselInternals'
import { IconButton } from './IconButton'
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
 * Volle-Breite Thumbnail-Leiste unterhalb der Bild-Bühne. Wiederverwendet centeredScrollLeft/
 * directItemElements aus FocalCarouselInternals.tsx für das Auto-Scroll-Verhalten, statt die
 * Scroll-Zentrierungs-Mathematik erneut zu bauen. Rendert nichts bei weniger als zwei Bildern.
 * Jede Vorschau nutzt `IconButton`s offizielle `media`-Variante (feste 96x64-Kachel, "ausgewählt"
 * über `aria-current`, derselbe Mechanismus wie bei `Button`/den Picker-Kacheln) statt eines
 * eigenen nativen `<button>` -- die Kachel ist ein Dateninhalt-Button (ein Vorschaubild), kein
 * eigenständiges ARIA-Widget mit abweichender Semantik.
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
            <IconButton
              key={item.key}
              variant="media"
              className={styles.thumb}
              data-focal-carousel-item
              icon={<ResponsiveImage src={item.thumbnailUrl} alt="" fill sizes="96px" className={styles.thumbImage} />}
              aria-label={`Bild ${index + 1} von ${items.length} anzeigen`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => onSelect(index)}
            />
          ))}
        </div>
      </div>
      <span className={styles.counter}>
        {activeIndex + 1} / {items.length}
      </span>
    </div>
  )
}
