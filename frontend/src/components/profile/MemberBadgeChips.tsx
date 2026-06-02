'use client'

import { patchMyBadgeVisibility } from '@/lib/api'
import type { MemberBadge } from '@/types/contributions'

import styles from './profile.module.css'

const BADGE_LABELS: Record<string, string> = {
  founding_member: '★ Gründungsmitglied',
  historical_leader: '♦ Historischer Leader',
  long_term_member: '◆ 5+ Jahre Mitglied',
}

type MemberBadgeChipsProps = {
  badges: MemberBadge[]
  isOwnProfile: boolean
  token?: string
  onVisibilityChanged?: (badgeId: number, visibility: string) => void
}

export function MemberBadgeChips({
  badges,
  isOwnProfile,
  token,
  onVisibilityChanged,
}: MemberBadgeChipsProps) {
  const visibleBadges = badges.filter((b) => b.visibility !== 'hidden')

  if (visibleBadges.length === 0) {
    return null
  }

  async function handleHide(badgeId: number) {
    if (!token) return
    try {
      await patchMyBadgeVisibility(token, badgeId, 'hidden')
      onVisibilityChanged?.(badgeId, 'hidden')
    } catch {
      // Fehler ignorieren — Badge bleibt sichtbar
    }
  }

  return (
    <div className={styles.badgeChipsRow}>
      {visibleBadges.map((badge) => {
        const label = BADGE_LABELS[badge.badge_code] ?? badge.badge_code
        return (
          <span key={badge.id} className={styles.badgeChip}>
            {label}
            {isOwnProfile && (
              <button
                type="button"
                className={styles.badgeHideBtn}
                onClick={() => handleHide(badge.id)}
              >
                Ausblenden
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
