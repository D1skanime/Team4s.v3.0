'use client'

import { Button, FocalCarousel } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import { FansubProjectBannerCard } from './FansubProjectBannerCard'
import styles from './FansubProjectsSection.module.css'

interface FansubProjectsGridItem {
  project: PublicFansubProject
  statusLabel: string
  statusVariant: 'warning' | 'success' | 'danger'
}

interface FansubProjectsGridProps {
  items: FansubProjectsGridItem[]
  groupId: number
  groupSlug?: string | null
}

const PREVIEW_COUNT = 20

export function FansubProjectsGrid({ items, groupId, groupSlug }: FansubProjectsGridProps) {
  if (items.length === 0) return null

  const hasMore = items.length > PREVIEW_COUNT
  const previewItems = hasMore ? items.slice(0, PREVIEW_COUNT) : items
  const remaining = items.length - PREVIEW_COUNT
  const carouselItems: Array<FansubProjectsGridItem | { more: true }> = hasMore
    ? [...previewItems, { more: true }]
    : previewItems

  const renderProject = (item: FansubProjectsGridItem) => (
    <FansubProjectBannerCard
      project={item.project}
      groupId={groupId}
      fansubSlug={groupSlug}
      statusLabel={item.statusLabel}
      statusVariant={item.statusVariant}
    />
  )

  return (
    <FocalCarousel
      items={items}
      carouselItems={carouselItems}
      getItemKey={(item) => ('more' in item ? 'more-projects' : item.project.id)}
      regionLabel="Projekt-Vorschau"
      itemSingularLabel="Projekt"
      itemPluralLabel="Projekte"
      previousLabel="Vorherige Projekte"
      nextLabel="Weitere Projekte"
      carouselClassName={styles.projectCarousel}
      itemClassName={styles.projectWindow}
      activeItemClassName={styles.projectWindowActive}
      gridClassName={styles.projectGrid}
      renderItem={(item, state) =>
        'more' in item ? (
          <Button
            type="button"
            variant="ghost"
            className={styles.projectCountCard}
            aria-label={`Alle ${items.length} Projekte anzeigen`}
            onClick={state.showAll}
          >
            <span className={styles.projectCountValue}>+{remaining}</span>
            <span className={styles.projectCountLabel}>weitere Projekte</span>
            <span className={styles.projectCountAction}>Alle anzeigen</span>
          </Button>
        ) : renderProject(item)
      }
      showLessLabel="Weniger anzeigen"
    />
  )
}
