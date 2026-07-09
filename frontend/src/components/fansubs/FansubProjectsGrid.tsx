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

const GRID_INITIAL = 8

/**
 * AO6-06 (Ueberarbeitung): responsives Grid fuer abgeschlossene/archivierte Projekte
 * statt eines horizontalen Karussells. Das Grid bricht per Breakpoint um (Mobil 2 /
 * Tablet 3 / Desktop 4 Spalten), zeigt initial GRID_INITIAL Karten und blendet den
 * Rest inline ueber "X weitere anzeigen" ein (kein Auto-Scroll, kein Seiten-Overflow).
 */
export function FansubProjectsGrid({ items, groupId }: FansubProjectsGridProps) {
  const [visibleCount, setVisibleCount] = useState(Math.min(GRID_INITIAL, items.length))

  if (items.length === 0) {
    return null
  }

  const visibleItems = items.slice(0, visibleCount)
  const remaining = items.length - visibleCount

  return (
    <div className={styles.projectsGroup}>
      <div className={styles.projectGrid}>
        {visibleItems.map(({ project, statusLabel }) => (
          <FansubProjectBannerCard key={project.id} project={project} groupId={groupId} statusLabel={statusLabel} />
        ))}
      </div>
      {remaining > 0 ? (
        <Button
          type="button"
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
