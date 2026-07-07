import { Lock } from 'lucide-react'

import { Badge, Card, SectionHeader } from '@/components/ui'
import type { PublicMemberBadge } from '@/types/profile'

import {
  PUBLIC_MEMBER_BADGE_CATALOG,
  getMemberBadgePresentation,
  type PublicMemberBadgeCatalogItem,
} from './memberBadgeLabels'
import styles from './MemberBadgeChain.module.css'

type MemberBadgeChainProps = {
  earnedBadges: PublicMemberBadge[]
  catalog?: PublicMemberBadgeCatalogItem[]
}

function catalogWithEarnedBadges(
  catalog: PublicMemberBadgeCatalogItem[],
  earnedBadges: PublicMemberBadge[],
): PublicMemberBadgeCatalogItem[] {
  const seen = new Set(catalog.map((item) => item.badge_code))
  const additions = earnedBadges
    .filter((badge) => {
      if (seen.has(badge.badge_code)) return false
      seen.add(badge.badge_code)
      return true
    })
    .map((badge) => ({
      badge_code: badge.badge_code,
      badge_category: badge.badge_category,
      label: getMemberBadgePresentation(badge.badge_code).label,
    }))

  return [...catalog, ...additions]
}

export function MemberBadgeChain({
  earnedBadges,
  catalog = PUBLIC_MEMBER_BADGE_CATALOG,
}: MemberBadgeChainProps) {
  const earnedCodes = new Set(earnedBadges.map((badge) => badge.badge_code))
  const visibleCatalog = catalogWithEarnedBadges(catalog, earnedBadges)
  const earnedCount = visibleCatalog.filter((item) => earnedCodes.has(item.badge_code)).length

  return (
    <section className={styles.section}>
      <SectionHeader
        title="Auszeichnungen"
        description={`${earnedCount} von ${visibleCatalog.length}`}
      />

      <Card variant="section" className={styles.chainCard}>
        <ul className={styles.chain} aria-label="Auszeichnungen" data-orientation="horizontal">
          {visibleCatalog.map((item) => {
            const isEarned = earnedCodes.has(item.badge_code)
            const presentation = getMemberBadgePresentation(item.badge_code)
            const Icon = presentation.Icon

            return (
              <li key={item.badge_code} className={isEarned ? styles.badgeStep : styles.badgeStepLocked}>
                <Badge
                  variant={isEarned ? presentation.variant : 'muted'}
                  className={styles.badgeItem}
                >
                  {isEarned ? (
                    <Icon size={15} aria-hidden="true" />
                  ) : (
                    <span className={styles.lockIcon} aria-label={`${item.label} gesperrt`}>
                      <Lock size={15} aria-hidden="true" />
                    </span>
                  )}
                  <span>{item.label}</span>
                </Badge>
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}
