'use client'

import { useState } from 'react'
import Image from 'next/image'

import { Badge, Button, Card, EmptyState } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { getFansubMediaCategoryLabel } from '@/lib/fansub-labels'
import type { PublicFansubMediaItem } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubGroupMediaBlockProps {
  media: PublicFansubMediaItem[]
  onSelect?: (index: number) => void
}

const MEDIA_IMAGE_SIZES = '(max-width: 640px) 100vw, 220px'
const PREVIEW_LIMIT = 5
const MEDIA_BATCH = 10

function isImage(item: PublicFansubMediaItem): boolean {
  return item.mime_type.startsWith('image/')
}

/**
 * AO6-11: begrenzt die Vorschau auf 5 Kacheln (letzte Kachel als '+X weitere'-Ueberlauf,
 * sobald mehr Medien vorhanden sind), erweitert das Grid inline batchweise ueber
 * 'Alle N anzeigen' bzw. Klick auf die Ueberlaufkachel (kein Auto-Scroll/Nachladen).
 * Bild-Thumbnails sind klickbare Trigger (onSelect) als Seam fuer die Lightbox aus 99-25.
 */
export function FansubGroupMediaBlock({ media, onSelect }: FansubGroupMediaBlockProps) {
  const [visibleCount, setVisibleCount] = useState(PREVIEW_LIMIT)

  if (media.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Noch keine Medien hinterlegt"
        description="Diese Gruppe hat bisher keine öffentlichen Kontextmedien bereitgestellt."
      />
    )
  }

  const hasOverflow = media.length > visibleCount
  const cardSlots = hasOverflow ? visibleCount - 1 : visibleCount
  const visibleItems = media.slice(0, cardSlots)
  const overflowCount = media.length - cardSlots

  function revealMore() {
    setVisibleCount((current) => Math.min(media.length, current + MEDIA_BATCH))
  }

  function revealAll() {
    setVisibleCount(media.length)
  }

  return (
    <div className={styles.compactStack}>
      <div className={styles.mediaItemGrid}>
        {visibleItems.map((item, globalIndex) => {
          const imageUrl = item.thumbnail_url || item.original_url
          const resolvedImageUrl = imageUrl ? resolveApiUrl(imageUrl) : null
          const showImage = Boolean(resolvedImageUrl) && isImage(item)
          const title = item.title?.trim() || item.caption?.trim() || item.media_type
          const description = item.description?.trim()

          return (
            <Card key={item.id} variant="section" className={styles.mediaCard}>
              {showImage && resolvedImageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={styles.mediaThumbTrigger}
                  aria-label={title}
                  onClick={() => onSelect?.(globalIndex)}
                >
                  <div className={styles.mediaThumbFrame}>
                    <Image
                      src={resolvedImageUrl}
                      alt={title}
                      fill
                      sizes={MEDIA_IMAGE_SIZES}
                      loading="lazy"
                      className={styles.mediaImage}
                      unoptimized
                    />
                  </div>
                </Button>
              ) : (
                <div className={styles.mediaThumbFrame}>
                  <div className={styles.mediaThumbSkeleton} aria-hidden="true" />
                </div>
              )}
              <div className={styles.mediaCardBody}>
                <div className={styles.mediaCardHeader}>
                  <strong className={styles.mediaLabel}>{title}</strong>
                  <Badge variant="neutral">{getFansubMediaCategoryLabel(item.category)}</Badge>
                </div>
                {description ? <p className={styles.mediaDescription}>{description}</p> : null}
                {item.original_url && !isImage(item) ? (
                  <a href={resolveApiUrl(item.original_url)} className={styles.inlineLink}>
                    Medium öffnen
                  </a>
                ) : null}
              </div>
            </Card>
          )
        })}
        {hasOverflow ? (
          <Card variant="section" className={styles.mediaCard}>
            <Button type="button" variant="ghost" className={styles.mediaOverflowTile} onClick={revealMore}>
              +{overflowCount} weitere
            </Button>
          </Card>
        ) : null}
      </div>
      {hasOverflow ? (
        <div className={styles.mediaShowAll}>
          <Button type="button" variant="subtle" onClick={revealAll}>
            Alle {media.length} anzeigen
          </Button>
        </div>
      ) : null}
    </div>
  )
}
