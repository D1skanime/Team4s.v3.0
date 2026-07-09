'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import { FansubProjectBannerCard } from './FansubProjectBannerCard'
import styles from './FansubProjectsSection.module.css'

interface FansubProjectsGridItem {
  project: PublicFansubProject
  statusLabel: string
}

interface FansubProjectsGridProps {
  items: FansubProjectsGridItem[]
  groupId: number
}

const PREVIEW_COUNT = 5
const CARD_SCROLL = 256

/**
 * AO6-06/AO7-03: Projekte als horizontales Vorschau-Karussell (erste PREVIEW_COUNT
 * Projekte zum Durchwischen, scroll-snap, Pfeile + Tastatur, versteckte Scrollbar,
 * kein Seiten-Overflow). Am Ende eine Zaehler-Card ("+X weitere Projekte"), die beim
 * Klick alle Projekte inline als responsives Grid ausklappt (dann "Weniger anzeigen").
 */
export function FansubProjectsGrid({ items, groupId }: FansubProjectsGridProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) {
    return null
  }

  const hasMore = items.length > PREVIEW_COUNT
  const remaining = items.length - PREVIEW_COUNT

  if (expanded) {
    return (
      <div className={styles.projectsGroup}>
        <div className={styles.projectGrid}>
          {items.map(({ project, statusLabel }) => (
            <FansubProjectBannerCard key={project.id} project={project} groupId={groupId} statusLabel={statusLabel} />
          ))}
        </div>
        <Button type="button" variant="subtle" size="sm" className={styles.moreTile} onClick={() => setExpanded(false)}>
          Weniger anzeigen
        </Button>
      </div>
    )
  }

  const previewItems = hasMore ? items.slice(0, PREVIEW_COUNT) : items

  const scrollByCards = (direction: 'left' | 'right') => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction === 'right' ? CARD_SCROLL : -CARD_SCROLL, behavior: 'smooth' })
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
          aria-label="Projekt-Vorschau"
          tabIndex={0}
          onKeyDown={handleTrackKeyDown}
        >
          {previewItems.map(({ project, statusLabel }) => (
            <div key={project.id} className={styles.carouselItem}>
              <FansubProjectBannerCard project={project} groupId={groupId} statusLabel={statusLabel} />
            </div>
          ))}
          {hasMore ? (
            <Button
              type="button"
              variant="ghost"
              className={`${styles.carouselItem} ${styles.projectCountCard}`}
              onClick={() => setExpanded(true)}
              aria-label={`Alle ${items.length} Projekte anzeigen`}
            >
              <span className={styles.projectCountValue}>+{remaining}</span>
              <span className={styles.projectCountLabel}>weitere Projekte</span>
            </Button>
          ) : null}
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
    </div>
  )
}
