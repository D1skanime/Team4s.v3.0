'use client'

import { useState } from 'react'

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

/**
 * AO6-06/AO7-03: Vorschau der ersten PREVIEW_COUNT Projekte als responsive
 * Banner-Kacheln (Breakpoint-Grid, kein horizontales Karussell) plus eine
 * "Zaehler-Card" als naechste Kachel, die beim Klick alle Projekte inline
 * ausklappt. Im ausgeklappten Zustand ein "weniger anzeigen"-Button.
 */
export function FansubProjectsGrid({ items, groupId }: FansubProjectsGridProps) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) {
    return null
  }

  const hasMore = items.length > PREVIEW_COUNT
  const showCountCard = hasMore && !expanded
  const visibleItems = showCountCard ? items.slice(0, PREVIEW_COUNT) : items
  const remaining = items.length - PREVIEW_COUNT

  return (
    <div className={styles.projectsGroup}>
      <div className={styles.projectGrid}>
        {visibleItems.map(({ project, statusLabel }) => (
          <FansubProjectBannerCard key={project.id} project={project} groupId={groupId} statusLabel={statusLabel} />
        ))}
        {showCountCard ? (
          <Button
            type="button"
            variant="ghost"
            className={styles.projectCountCard}
            onClick={() => setExpanded(true)}
            aria-label={`Alle ${items.length} Projekte anzeigen`}
          >
            <span className={styles.projectCountValue}>+{remaining}</span>
            <span className={styles.projectCountLabel}>weitere Projekte</span>
          </Button>
        ) : null}
      </div>
      {expanded && hasMore ? (
        <Button type="button" variant="subtle" size="sm" className={styles.moreTile} onClick={() => setExpanded(false)}>
          Weniger anzeigen
        </Button>
      ) : null}
    </div>
  )
}
