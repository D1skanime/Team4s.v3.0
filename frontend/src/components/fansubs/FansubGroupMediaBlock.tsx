'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Maximize2 } from 'lucide-react'

import { Button, EmptyState } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { getFansubMediaCategoryLabel } from '@/lib/fansub-labels'
import type { PublicFansubMediaItem } from '@/types/fansub'

import { FansubMediaLightbox } from './FansubMediaLightbox'
import styles from './FansubPublicSections.module.css'

interface FansubGroupMediaBlockProps {
  media: PublicFansubMediaItem[]
  onSelect?: (index: number) => void
}

const MEDIA_IMAGE_SIZES = '(max-width: 640px) 100vw, 220px'
const PREVIEW_LIMIT = 5
const MEDIA_BATCH = 10

const CATEGORY_TAG_CLASS: Record<string, string> = {
  gallery: 'tagGallery',
  history_screenshot: 'tagHistory',
  old_website: 'tagOldweb',
  forum: 'tagForum',
  irc_chat: 'tagIrc',
  event_meeting: 'tagEvent',
  artwork_fanart: 'tagArtwork',
  other: 'tagOther',
}

function categoryTagClass(category: string): string {
  return CATEGORY_TAG_CLASS[category] || 'tagOther'
}

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
            <div key={item.id} className={styles.mediaCard}>
              {showImage && resolvedImageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={styles.mediaThumbTrigger}
                  aria-label={title}
                  onClick={() => openLightbox(globalIndex)}
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
                <div className={styles.mediaCardHeader}>
                  <strong className={styles.mediaLabel}>{title}</strong>
                  <span className={`${styles.mediaTag} ${styles[categoryTagClass(item.category)]}`}>
                    {getFansubMediaCategoryLabel(item.category)}
                  </span>
                </div>
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
        {hasOverflow ? (
          <Button type="button" variant="ghost" className={styles.mediaOverflowTile} onClick={revealMore}>
            +{overflowCount} weitere
          </Button>
        ) : null}
      </div>
      {hasOverflow ? (
        <div className={styles.mediaShowAll}>
          <Button type="button" variant="subtle" onClick={revealAll}>
            Alle {media.length} anzeigen
          </Button>
        </div>
      ) : null}
      <FansubMediaLightbox
        media={media}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />
    </div>
  )
}
