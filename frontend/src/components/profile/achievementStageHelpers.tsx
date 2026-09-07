'use client'

import { Lock } from 'lucide-react'
import { useState } from 'react'

import type { AchievementArtworkDescriptor } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import lockedStageArtworkStyles from './LockedStageArtwork.module.css'
import { resolveBadgeArtwork } from './badgeArtwork'
import type { MemberBadgeFamilyPresentation } from './memberBadgeFamilies'

type PreviewSelection = {
  badgeCode: string
  currentCount: number | null
  currentCode: string | null
}

export function useFamilyPreview(family: MemberBadgeFamilyPresentation) {
  const currentCode = family.currentStage?.badge_code ?? null
  const [selection, setSelection] = useState<PreviewSelection | null>(null)
  const selectedCode =
    selection?.currentCount === family.currentCount && selection.currentCode === currentCode
      ? selection.badgeCode
      : null
  const setSelectedCode = (badgeCode: string | null) =>
    setSelection(
      badgeCode
        ? {
            badgeCode,
            currentCount: family.currentCount,
            currentCode,
          }
        : null,
    )
  return [selectedCode, setSelectedCode] as const
}

export function resolveProgressArtworkDescriptor(
  badgeCode: string,
): AchievementArtworkDescriptor | undefined {
  if (badgeCode === 'first_contribution') {
    return {
      kind: 'layered',
      motifSrc: '/member-achievement-badges/progress-first_contribution-motif.png',
      frameSrc: '/member-achievement-badges/progress-frame-first_contribution.png',
    }
  }
  const productiveMatch = /^productive_(bronze|silver|gold)$/.exec(badgeCode)
  if (productiveMatch) {
    return {
      kind: 'layered',
      motifSrc: '/member-achievement-badges/progress-productive-motif.png',
      frameSrc: `/member-achievement-badges/progress-frame-productive-${productiveMatch[1]}.png`,
    }
  }
  const src = resolveBadgeArtwork(badgeCode)
  return src ? { kind: 'direct', src } : undefined
}

export function LockedStageArtwork({
  className,
  hero = false,
}: {
  className?: string
  hero?: boolean
}) {
  const artworkClassName = [
    artworkStyles.slot,
    hero ? artworkStyles.hero : artworkStyles.stage,
    className,
    lockedStageArtworkStyles.lockedStageArtwork,
    hero ? lockedStageArtworkStyles.lockedStageArtworkHero : null,
  ]
    .filter(Boolean)
    .join(' ')
  if (hero)
    return (
      <span
        className={artworkClassName}
        data-achievement-slot
        data-achievement-size="hero"
        data-locked-stage-art
        data-locked-stage-hero
      >
        <span className={lockedStageArtworkStyles.lockedStageHeroMedal} aria-hidden="true">
          <span className={lockedStageArtworkStyles.lockedStageHeroQuestion}>?</span>
          <Lock className={lockedStageArtworkStyles.lockedStageHeroLock} />
        </span>
        <span className={lockedStageArtworkStyles.lockedStageHeroCopy}>
          Noch nicht freigeschaltet
        </span>
      </span>
    )
  return (
    <span
      className={artworkClassName}
      data-achievement-slot
      data-achievement-size="stage"
      data-locked-stage-art
      aria-hidden="true"
    >
      <span>?</span>
      <Lock size={16} />
    </span>
  )
}
