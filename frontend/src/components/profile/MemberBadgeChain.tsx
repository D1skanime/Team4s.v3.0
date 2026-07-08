import { Lock } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'
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
  const progressPercent = visibleCatalog.length > 0
    ? Math.round((earnedCount / visibleCatalog.length) * 100)
    : 0

  return (
    <section className={styles.section}>
      <SectionHeader title="Auszeichnungen" />

      <Card variant="section" className={styles.chainCard}>
        <div className={styles.progressBlock} aria-label={`${earnedCount} von ${visibleCatalog.length} Auszeichnungen`}>
          <div className={styles.progressMeta}>
            <span>{earnedCount} von {visibleCatalog.length}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <ul className={styles.chain} aria-label="Auszeichnungen" data-orientation="horizontal">
          {visibleCatalog.map((item) => {
            const isEarned = earnedCodes.has(item.badge_code)
            const presentation = getMemberBadgePresentation(item.badge_code)
            const Icon = presentation.Icon

            return (
              <li
                key={item.badge_code}
                className={isEarned ? styles.badgeStep : styles.badgeStepLocked}
                data-palette={presentation.palette}
                data-earned={isEarned ? 'true' : 'false'}
              >
                <span className={styles.badgeItem}>
                  <span className={styles.badgeIcon} aria-label={isEarned ? undefined : `${item.label} gesperrt`}>
                    {isEarned ? <Icon size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                  </span>
                  <span>{item.label}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}
