import { Badge, Card, EmptyState } from '@/components/ui'
import type { MemberProfileRecentContribution } from '@/types/profile'

import styles from '../page.module.css'

type RecentContributionsSectionProps = {
  items: MemberProfileRecentContribution[]
  canView: boolean
  isPublicView?: boolean
}

export function RecentContributionsSection({ items, canView }: RecentContributionsSectionProps) {
  if (!canView || items.length === 0) {
    return <EmptyState title="Noch keine Projekte sichtbar." />
  }

  return (
    <ul className={styles.recentList} aria-label="Letzte Projekte">
      {items.slice(0, 3).map((item) => (
        <li key={item.id}>
          <Card variant="nestedFlat" className={styles.recentContributionCard}>
            <div className={styles.recentItemBody}>
              <strong>{item.anime_title}</strong>
              <div className={styles.chipRow}>
                <Badge variant="info">{item.fansub_group_name}</Badge>
                <Badge variant="success">{item.role_label}</Badge>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
