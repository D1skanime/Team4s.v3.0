'use client'

import { useState } from 'react'

import { Button } from '@/components/ui'
import { patchMyBadgeVisibility } from '@/lib/api'
import type { MemberBadge } from '@/types/contributions'

import { formatMemberBadgeLabel } from './memberBadgeLabels'
import styles from './profile.module.css'

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
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    setHiddenIds((prev) => new Set(prev).add(badgeId))
    try {
      await patchMyBadgeVisibility(token, badgeId, 'hidden')
      onVisibilityChanged?.(badgeId, 'hidden')
    } catch {
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
        {visibleBadges.map((badge) => (
          <span key={badge.id} className={styles.badgeChip}>
            {formatMemberBadgeLabel(badge.badge_code)}
            {isOwnProfile ? (
              <Button
                variant="ghost"
                size="sm"
                className={styles.badgeHideBtn}
                onClick={() => handleHide(badge.id)}
                disabled={pendingId === badge.id}
              >
                Ausblenden
              </Button>
            ) : null}
          </span>
        ))}
      </div>
      {error ? (
        <p role="alert" className={styles.badgeError}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
