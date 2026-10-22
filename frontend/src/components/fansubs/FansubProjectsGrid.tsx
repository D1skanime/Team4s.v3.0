'use client'

import type { CSSProperties } from 'react'

import { Button, FocalCarousel } from '@/components/ui'
import type { PublicFansubProject } from '@/types/fansub'

import { decideProjectsLayout } from './fansubProjectsLayout'
import { useFansubProjectsBreakpoint } from './useFansubProjectsBreakpoint'
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
  // Rule 1 (Bugfix): useFansubProjectsBreakpoint() muss vor jedem bedingten Return
  // aufgerufen werden (Rules of Hooks) -- ein Aufruf erst nach dem items.length===0-Check
  // wuerde die Hook-Aufrufreihenfolge zerstoeren, sobald items.length zwischen Renders
  // derselben Komponenteninstanz von 0 auf >0 wechselt.
  const breakpoint = useFansubProjectsBreakpoint()
  if (items.length === 0) return null

  const layout = decideProjectsLayout(items.length, breakpoint)

  const renderProject = (item: FansubProjectsGridItem, key?: string | number) => (
    <FansubProjectBannerCard
      key={key}
      project={item.project}
      groupId={groupId}
      fansubSlug={groupSlug}
      statusLabel={item.statusLabel}
      statusVariant={item.statusVariant}
    />
  )

  // quick-261022-dwe: Passen alle Projekte nebeneinander in die Spaltenzahl des
  // Medien-Kachelrasters derselben Seite, wird ein reines, linksbuendiges CSS-Raster in
  // Medien-Kachelgroesse gerendert -- kein FocalCarousel, keine Navigationspfeile. Das
  // deckt sowohl den bisherigen Einzelprojekt-Sonderfall (190-09) als auch 2-3 Projekte
  // auf Desktop bzw. 2 Projekte auf Tablet ab. Passt die Anzahl nicht (Mobile mit 2+ oder
  // Ueberlauf auf Desktop/Tablet), bleibt das bestehende FocalCarousel erhalten.
  if (layout.mode === 'grid') {
    return (
      <div className={styles.projectTileGrid}>
        {items.map((item) => renderProject(item, item.project.id))}
      </div>
    )
  }

  const hasMore = items.length > PREVIEW_COUNT
  const previewItems = hasMore ? items.slice(0, PREVIEW_COUNT) : items
  const remaining = items.length - PREVIEW_COUNT
  const carouselItems: Array<FansubProjectsGridItem | { more: true }> = hasMore
    ? [...previewItems, { more: true }]
    : previewItems

  // 'carousel-peek' (Mobile, 2+ Projekte) bleibt exakt wie heute: presentation/style
  // bleiben undefined, also Default-"focal"-Zentrierung mit Anriss der naechsten Karte.
  // 'scroll-strip' (Ueberlauf auf Desktop/Tablet) nutzt die additive grid-scroll-Praesentation
  // aus FocalCarousel: linksbuendig, keine Abdunklung, Kachelgroesse ueber die CSS-Variable.
  const isScrollStrip = layout.mode === 'scroll-strip'

  return (
    <FocalCarousel
      items={items}
      carouselItems={carouselItems}
      presentation={isScrollStrip ? 'grid-scroll' : undefined}
      style={
        isScrollStrip
          ? ({
              '--grid-scroll-item-size': `calc((100% - 12px * ${layout.columns - 1}) / ${layout.columns})`,
            } as CSSProperties)
          : undefined
      }
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
