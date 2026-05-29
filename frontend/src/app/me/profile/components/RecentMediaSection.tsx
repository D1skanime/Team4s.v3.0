import { Badge, Card, EmptyState } from '@/components/ui'
import type { MemberProfileRecentMedia } from '@/types/profile'

import styles from '../page.module.css'

type RecentMediaSectionProps = {
  items: MemberProfileRecentMedia[]
  canView: boolean
  isPublicView?: boolean
}

export function RecentMediaSection({ items, canView }: RecentMediaSectionProps) {
  if (!canView || items.length === 0) {
    return <EmptyState title="Noch keine Medien hochgeladen." />
  }

  return (
    <ul className={styles.recentMediaGrid} aria-label="Letzte Medien">
      {items.slice(0, 3).map((item) => (
        <li key={item.id}>
          <Card variant="nested" className={styles.recentMediaCard}>
            <div className={styles.recentMediaThumb}>
              {item.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <span aria-hidden="true">{item.category.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className={styles.recentItemBody}>
              <Badge variant="info">{item.category}</Badge>
              <strong>{item.anime_title}</strong>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
