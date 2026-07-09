'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import { FansubProjectBannerCard } from './FansubProjectBannerCard'
import styles from './FansubProjectsSection.module.css'

interface FansubProjectsCarouselItem {
  project: PublicFansubProject
  statusLabel: string
}

interface FansubProjectsCarouselProps {
  items: FansubProjectsCarouselItem[]
  groupId: number
}

const CAROUSEL_INITIAL = 8
const CARD_SCROLL_WIDTH = 252

/**
 * AO6-06: horizontales Karussell fuer abgeschlossene/archivierte Projekte.
 * scroll-snap-Bahn, Pfeil-Buttons (@/components/ui Button) und Tastaturbedienung
 * (ArrowLeft/ArrowRight auf der Bahn selbst), Banner-Bilder laden per loading="lazy"
 * (bannerFrame-Flaeche als Platzhalter), sowie eine "X weitere anzeigen"-Endkachel,
 * die den Rest inline aus dem bereits geladenen Datensatz einblendet (kein
 * Netzwerk-Nachladen, kein Auto-Scroll).
 */
export function FansubProjectsCarousel({ items, groupId }: FansubProjectsCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(Math.min(CAROUSEL_INITIAL, items.length))

  if (items.length === 0) {
    return null
  }

  const visibleItems = items.slice(0, visibleCount)
  const remaining = items.length - visibleCount

  const scrollByCards = (direction: 'left' | 'right') => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction === 'right' ? CARD_SCROLL_WIDTH : -CARD_SCROLL_WIDTH, behavior: 'smooth' })
  }

  const handleTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollByCards('right')
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollByCards('left')
    }
  }

  return (
    <div className={styles.carouselShell}>
      <div className={styles.carouselRow}>
        <Button
          variant="ghost"
          iconOnly
          className={styles.carouselArrow}
          aria-label="Vorherige Projekte"
          onClick={() => scrollByCards('left')}
        >
          <ChevronLeft size={18} />
        </Button>
        <div
          ref={trackRef}
          className={styles.carouselTrack}
          role="region"
          aria-label="Projekt-Karussell"
          tabIndex={0}
          onKeyDown={handleTrackKeyDown}
        >
          {visibleItems.map(({ project, statusLabel }) => (
            <div key={project.id} className={styles.carouselItem}>
              <FansubProjectBannerCard project={project} groupId={groupId} statusLabel={statusLabel} />
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          iconOnly
          className={styles.carouselArrow}
          aria-label="Weitere Projekte"
          onClick={() => scrollByCards('right')}
        >
          <ChevronRight size={18} />
        </Button>
      </div>
      {remaining > 0 ? (
        <Button
          variant="subtle"
          size="sm"
          className={styles.moreTile}
          onClick={() => setVisibleCount(items.length)}
        >
          {`${remaining} weitere anzeigen`}
        </Button>
      ) : null}
    </div>
  )
}
