import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { PublicReleaseMediaItem } from '@/types/groupContributors'

import styles from '../page.module.css'

interface MediaSectionProps {
  items: PublicReleaseMediaItem[]
}

export function MediaSection({ items }: MediaSectionProps) {
  return (
    /* Section ALWAYS visible (D-15) — EmptyState when no items */
    <div id="medien" className={styles.mediaSection}>
      <SectionHeader title="Release-Einblicke" />
      {items.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Noch keine Release-Einblicke"
          description="Für dieses Projekt sind bisher keine öffentlichen Medien freigegeben."
        />
      ) : (
        <Card variant="section">
          <div className={styles.galleryGrid}>
            {items.map((item) => (
              <div key={item.id} className={styles.galleryTile}>
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.caption ? `Release-Einblick: ${item.caption}` : 'Release-Einblick'}
                    className={styles.galleryThumb}
                  />
                ) : null}
                {item.caption ? (
                  <p className={styles.galleryCaption}>{item.caption}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
