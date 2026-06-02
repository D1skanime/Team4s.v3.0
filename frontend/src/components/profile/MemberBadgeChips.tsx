'use client'

import { useState } from 'react'

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
  // Optimistisch ausgeblendete Badges (sofortiges UI-Feedback, Rollback bei Fehler).
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Im eigenen Profil sieht der Member 'public' und 'internal' (nur 'hidden' ist weg);
  // öffentliche Besucher sehen ausschließlich 'public' — 'internal' darf nicht durchsickern.
  const visibleBadges = badges.filter((b) => {
    if (hiddenIds.has(b.id)) return false
    return isOwnProfile ? b.visibility !== 'hidden' : b.visibility === 'public'
  })

  if (visibleBadges.length === 0) {
    return null
  }

  async function handleHide(badgeId: number) {
    if (!token || pendingId !== null) return
    setError(null)
    setPendingId(badgeId)
    // Optimistisch ausblenden
    setHiddenIds((prev) => new Set(prev).add(badgeId))
    try {
      await patchMyBadgeVisibility(token, badgeId, 'hidden')
      onVisibilityChanged?.(badgeId, 'hidden')
    } catch {
      // Rollback + Fehlermeldung anzeigen
      setHiddenIds((prev) => {
        const next = new Set(prev)
        next.delete(badgeId)
        return next
      })
      setError('Badge konnte nicht ausgeblendet werden. Bitte versuche es erneut.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div>
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
                  disabled={pendingId === badge.id}
                >
                  Ausblenden
                </button>
              )}
            </span>
          )
        })}
      </div>
      {error && (
        <p role="alert" className={styles.badgeError}>
          {error}
        </p>
      )}
    </div>
  )
}
