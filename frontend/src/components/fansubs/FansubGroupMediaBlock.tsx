import Image from 'next/image'

import { Card, EmptyState } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import type { PublicFansubMediaItem } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubGroupMediaBlockProps {
  media: PublicFansubMediaItem[]
}

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
        const label = item.caption?.trim() || item.media_type

        return (
          <Card key={item.id} variant="section">
            {resolvedImageUrl && isImage(item) ? (
              <Image
                src={resolvedImageUrl}
                alt={label}
                width={320}
                height={180}
                className={styles.mediaImage}
                unoptimized
              />
            ) : null}
            <strong className={resolvedImageUrl && isImage(item) ? styles.mediaLabelWithImage : styles.mediaLabel}>
              {label}
            </strong>
            {item.original_url && !isImage(item) ? (
              <a href={resolveApiUrl(item.original_url)} className={styles.inlineLink}>
                Medium öffnen
              </a>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
