import { Badge } from '@/components/ui'
import type { MemberBadge } from '@/types/contributions'

import { getMemberBadgePresentation } from './memberBadgeLabels'
import styles from './profile.module.css'

type MemberBadgeChipsProps = {
  badges: MemberBadge[]
  isOwnProfile: boolean
}

export function MemberBadgeChips({ badges, isOwnProfile }: MemberBadgeChipsProps) {
  const visibleBadges = badges.filter((b) => {
    return isOwnProfile ? b.visibility !== 'hidden' : b.visibility === 'public'
  })

  if (visibleBadges.length === 0) {
    return null
  }

  return (
    <div className={styles.badgeChipsRow}>
      {visibleBadges.map((badge) => {
        const presentation = getMemberBadgePresentation(badge.badge_code)
        const Icon = presentation.Icon

        return (
          <Badge key={badge.id} variant={presentation.variant} className={styles.badgeChip}>
            <Icon size={14} aria-hidden="true" />
            {presentation.label}
          </Badge>
        )
      })}
    </div>
  )
}
