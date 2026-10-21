'use client'

import { useState } from 'react'
import { Maximize2 } from 'lucide-react'

import { Button, EmptyState, SectionHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { resolveApiUrl } from '@/lib/api'
import { getFansubMediaCategoryLabel } from '@/lib/fansub-labels'
import {
  groupFansubMediaByCategory,
  previewFansubMediaCategoryGroup,
  resolveFansubMediaTitle,
} from '@/lib/fansubMediaPresentation'
import type { PublicFansubMediaItem } from '@/types/fansub'

import { FansubMediaLightbox } from './FansubMediaLightbox'
import styles from './FansubPublicSections.module.css'

interface FansubGroupMediaBlockProps {
  media: PublicFansubMediaItem[]
  onSelect?: (index: number) => void
}

const MEDIA_IMAGE_SIZES = '(max-width: 639px) 100vw, (max-width: 999px) 50vw, 33vw'

function isImage(item: PublicFansubMediaItem): boolean {
  return item.mime_type.startsWith('image/')
}

/**
 * 190-09 (D-k, zweite Runde): jede Kategorie-Gruppe begrenzt sich selbst (6 Kacheln, 2 Zeilen a 3
 * im Desktop-Dreispalter) und hat ihr eigenes "Mehr anzeigen" -- kein globaler Overflow-Button
 * fuer den gesamten Medienbereich mehr (ersetzt das 190-05-Verhalten). Das Kategorie-Badge pro
 * Kachel entfaellt in dieser gruppierten Ansicht, da die Zwischenueberschrift die Kategorie
 * bereits nennt (sonst doppelt). Bild-Thumbnails sind klickbare Trigger (onSelect) als Seam fuer
 * die Lightbox aus 99-25.
 */
export function FansubGroupMediaBlock({ media, onSelect }: FansubGroupMediaBlockProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  function openLightbox(globalIndex: number) {
    setActiveIndex(globalIndex)
    onSelect?.(globalIndex)
  }

  if (media.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Noch keine Medien hinterlegt"
        description="Diese Gruppe hat bisher keine öffentlichen Kontextmedien bereitgestellt."
      />
    )
  }

  const indexById = new Map(media.map((item, index) => [item.id, index]))
  const mediaGroups = groupFansubMediaByCategory(media)

  function toggleCategory(category: string) {
    setExpandedCategories((current) => ({ ...current, [category]: !current[category] }))
  }

  return (
    <div className={styles.compactStack}>
      {mediaGroups.map((group) => {
        const preview = previewFansubMediaCategoryGroup(group, Boolean(expandedCategories[group.category]))

        return (
          <div key={group.category} className={styles.compactStack}>
            <SectionHeader title={getFansubMediaCategoryLabel(group.category)} level={3} underline />
            <div className={styles.mediaItemGrid}>
              {preview.visibleItems.map((item) => {
                const globalIndex = indexById.get(item.id)!
                const imageUrl = item.display_url || item.thumbnail_url || item.original_url
                const resolvedImageUrl = imageUrl ? resolveApiUrl(imageUrl) : null
                const showImage = Boolean(resolvedImageUrl) && isImage(item)
                const title = resolveFansubMediaTitle(item)
                const ariaLabel = title ?? item.caption?.trim() ?? 'Medium öffnen'
                const description = item.description?.trim()

                return (
                  <div key={item.id} className={styles.mediaCard}>
                    {showImage && resolvedImageUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className={styles.mediaThumbTrigger}
                        aria-label={ariaLabel}
                        onClick={() => openLightbox(globalIndex)}
                      >
                        <div className={styles.mediaThumbFrame}>
                          <ResponsiveImage
                            src={resolvedImageUrl}
                            alt=""
                            fill
                            sizes={MEDIA_IMAGE_SIZES}
                            loading="lazy"
                            className={styles.mediaImage}
                            quality={85}
                          />
                          <span className={styles.mediaMaximize} aria-hidden="true">
                            <Maximize2 size={14} />
                          </span>
                        </div>
                      </Button>
                    ) : (
                      <div className={styles.mediaThumbFrame}>
                        <div className={styles.mediaThumbSkeleton} aria-hidden="true" />
                      </div>
                    )}
                    <div className={styles.mediaCardBody}>
                      {title ? <strong className={styles.mediaLabel}>{title}</strong> : null}
                      {description ? <p className={styles.mediaDescription}>{description}</p> : null}
                      {item.original_url && !isImage(item) ? (
                        <a href={resolveApiUrl(item.original_url)} className={styles.inlineLink}>
                          Medium öffnen
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
            {preview.hasMore ? (
              <div className={styles.mediaShowAll}>
                <Button type="button" variant="subtle" onClick={() => toggleCategory(group.category)}>
                  {expandedCategories[group.category]
                    ? 'Weniger anzeigen'
                    : preview.remainingCount + ' weitere anzeigen'}
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}
      <FansubMediaLightbox
        media={media}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />
    </div>
  )
}
