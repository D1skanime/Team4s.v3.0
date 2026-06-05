'use client'

import { useState } from 'react'

import { Button } from '@/components/ui'
import type { PublicMemberBadge } from '@/types/profile'

import { formatMemberBadgeLabel } from './memberBadgeLabels'
import styles from './MemberBadgeHighlights.module.css'

// Gamification-/Mengenbadge-Kategorien, die bei memorial unterdrückt werden (D-10).
const GAMIFICATION_CATEGORIES = new Set(['quantity', 'gamification', 'streak', 'rank'])

// Gamification-Badge-Codes zusätzlich nach Code-Muster (D-10).
const GAMIFICATION_BADGE_CODES = new Set([
  'productive_bronze',
  'productive_silver',
  'productive_gold',
  'all_rounder',
])

const TOP_N = 4

function isGamificationBadge(badge: PublicMemberBadge): boolean {
  return (
    GAMIFICATION_CATEGORIES.has(badge.badge_category) ||
    GAMIFICATION_BADGE_CODES.has(badge.badge_code)
  )
}

// Sortiert Badges nach Wichtigkeit: zuerst nicht-Gamification, dann nach ID aufsteigend.
function sortBadges(badges: PublicMemberBadge[]): PublicMemberBadge[] {
  return [...badges].sort((a, b) => {
    const aGami = isGamificationBadge(a) ? 1 : 0
    const bGami = isGamificationBadge(b) ? 1 : 0
    if (aGami !== bGami) return aGami - bGami
    return a.id - b.id
  })
}

type MemberBadgeHighlightsProps = {
  /** Eingebettete öffentliche Badges aus dem DTO (Badges-13); kein UI-Recompute. */
  publicBadges: PublicMemberBadge[]
  /** Bei memorial werden Mengen-/Gamification-Badges unterdrückt (D-10). */
  isMemorial?: boolean
}

export function MemberBadgeHighlights({ publicBadges, isMemorial = false }: MemberBadgeHighlightsProps) {
  const [showAll, setShowAll] = useState(false)

  // D-10: Gamification-Badges bei memorial-Profilen unterdrücken.
  const filteredBadges = isMemorial
    ? publicBadges.filter((b) => !isGamificationBadge(b))
    : publicBadges

  if (filteredBadges.length === 0) {
    return (
      <p className={styles.emptyText}>
        {isMemorial ? 'Keine Ehren-Badges vergeben.' : 'Noch keine öffentlichen Badges vergeben.'}
      </p>
    )
  }

  // Top-N + „alle anzeigen"-Toggle — reines Slicing, kein State-Recompute (Lock 13).
  const sorted = sortBadges(filteredBadges)
  const topBadges = sorted.slice(0, TOP_N)
  const restBadges = sorted.slice(TOP_N)
  const hasMore = restBadges.length > 0

  const visibleBadges = showAll ? sorted : topBadges

  return (
    <div className={styles.container}>
      <div className={styles.badgeGrid}>
        {visibleBadges.map((badge) => (
          <span key={badge.id} className={styles.badgeItem}>
            <span className={styles.badgeLabel}>{formatMemberBadgeLabel(badge.badge_code)}</span>
            <span className={styles.badgeCategory}>{badge.badge_category}</span>
          </span>
        ))}
      </div>

      {hasMore ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll((prev) => !prev)}
          className={styles.toggleBtn}
        >
          {showAll
            ? `Weniger anzeigen`
            : `Alle ${filteredBadges.length} Badges anzeigen`}
        </Button>
      ) : null}
    </div>
  )
}
