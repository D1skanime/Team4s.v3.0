import Image from 'next/image'

import { Badge, Card, EmptyState } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import { getFansubMediaCategoryLabel } from '@/lib/fansub-labels'
import type { PublicFansubMediaItem } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubGroupMediaBlockProps {
  media: PublicFansubMediaItem[]
}

const MEDIA_IMAGE_SIZES = '(max-width: 640px) 100vw, 220px'

function isImage(item: PublicFansubMediaItem): boolean {
  return item.mime_type.startsWith('image/')
}

export function FansubGroupMediaBlock({ media }: FansubGroupMediaBlockProps) {
  if (media.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Noch keine Medien hinterlegt"
        description="Diese Gruppe hat bisher keine öffentlichen Kontextmedien bereitgestellt."
      />
    )
  }

  return (
    <div className={styles.mediaItemGrid}>
      {media.map((item) => {
        const imageUrl = item.thumbnail_url || item.original_url
        const resolvedImageUrl = imageUrl ? resolveApiUrl(imageUrl) : null
        const showImage = Boolean(resolvedImageUrl) && isImage(item)
        const title = item.title?.trim() || item.caption?.trim() || item.media_type
        const description = item.description?.trim()

        return (
          <Card key={item.id} variant="section" className={styles.mediaCard}>
            <div className={styles.mediaThumbFrame}>
              {showImage && resolvedImageUrl ? (
                <Image
                  src={resolvedImageUrl}
                  alt={title}
                  fill
                  sizes={MEDIA_IMAGE_SIZES}
                  loading="lazy"
                  className={styles.mediaImage}
                  unoptimized
                />
              ) : (
                <div className={styles.mediaThumbSkeleton} aria-hidden="true" />
              )}
            </div>
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
    </div>
  )
}
