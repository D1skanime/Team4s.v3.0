'use client'

import { Lock } from 'lucide-react'

import { Badge, Card } from '@/components/ui'
import type { PublicMemberBadge } from '@/types/profile'

import { AchievementArtwork } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import badgeChipStyles from './BadgeChip.module.css'
import chainStyles from './MemberBadgeChain.module.css'
import contributionAchievementStageStyles from './ContributionAchievementStage.module.css'
import type { MemberBadgeFamilyPresentation } from './memberBadgeFamilies'
import { getMemberBadgePresentation } from './memberBadgeLabels'
import {
  useFamilyPreview,
  LockedStageArtwork,
  resolveProgressArtworkDescriptor,
} from './achievementStageHelpers'

const CONTRIBUTION_TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin',
} as const

export function ContributionAchievementStage({
  family,
}: {
  family: MemberBadgeFamilyPresentation
}) {
  const [selectedCode, setSelectedCode] = useFamilyPreview(family)
  const currentCode = family.currentStage?.badge_code ?? null
  const selectedStage = family.stages.find(
    (stage) => stage.badge_code === selectedCode && stage.earned,
  )
  const heroStage = selectedStage ?? family.heroStage
  const presentation = getMemberBadgePresentation(heroStage.badge_code)
  const descriptor = resolveProgressArtworkDescriptor(heroStage.badge_code)
  const count = family.currentCount ?? 0
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(count, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const unit = count === 1 ? family.unitSingular : family.unitPlural
  const tierLabel = (code: string) =>
    CONTRIBUTION_TIER_LABELS[code.split('_').at(-1) as keyof typeof CONTRIBUTION_TIER_LABELS]
  const nextTier = family.nextStage ? tierLabel(family.nextStage.badge_code) : null

  return (
    <div className={artworkStyles.container}>
      <Card
        className={`${contributionAchievementStageStyles.contributionAchievementStage} ${chainStyles.contributionAchievementStage}`}
        data-family={family.key}
        data-contribution-achievement-stage
      >
        <h3
          className={`${contributionAchievementStageStyles.contributionStageTitle} ${chainStyles.contributionStageTitle}`}
        >
          {family.label}
        </h3>
        <div
          className={`${contributionAchievementStageStyles.contributionStageHero} ${chainStyles.contributionStageHero}`}
        >
          <span data-contribution-art={heroStage.badge_code}>
            {currentCode ? (
              descriptor ? (
                <AchievementArtwork
                  descriptor={descriptor}
                  badgeCode={heroStage.badge_code}
                  alt={heroStage.label}
                  size="hero"
                  className={`${contributionAchievementStageStyles.contributionHeroArtwork} ${chainStyles.contributionHeroArtwork}`}
                />
              ) : (
                <presentation.Icon size={96} aria-label={heroStage.label} />
              )
            ) : (
              <LockedStageArtwork hero />
            )}
          </span>
          <div
            className={`${contributionAchievementStageStyles.contributionStageInfo} ${chainStyles.contributionStageInfo}`}
            aria-live="polite"
          >
            <div className={contributionAchievementStageStyles.contributionStageStatus}>
              <Badge variant={currentCode ? presentation.variant : 'muted'}>
                {tierLabel(heroStage.badge_code)}
              </Badge>
              <Badge variant={selectedStage ? 'info' : currentCode ? 'success' : 'muted'}>
                {selectedStage ? 'Vorschau' : currentCode ? 'Aktuell' : 'Gesperrt'}
              </Badge>
            </div>
            <strong className={contributionAchievementStageStyles.contributionStageCount}>
              {count} {unit}
            </strong>
            <div className={contributionAchievementStageStyles.contributionStageProgressValue}>
              <span>
                {progressValue} / {progressMax}
              </span>
              <span>{Math.round(progressPercent)} %</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Fortschritt für ${family.label}`}
              aria-valuemin={0}
              aria-valuenow={progressValue}
              aria-valuemax={progressMax}
              className={contributionAchievementStageStyles.contributionStageProgressTrack}
            >
              <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
            </div>
            <p className={contributionAchievementStageStyles.contributionStageNext}>
              {family.complete
                ? 'Höchste Stufe erreicht'
                : `Noch ${family.remainingCount ?? 0} ${family.remainingCount === 1 ? family.unitSingular : family.unitPlural} bis ${nextTier}`}
            </p>
            {selectedStage ? (
              <p className={chainStyles.visuallyHidden}>
                Vorschau der bereits erreichten Stufe {tierLabel(heroStage.badge_code)}. Der
                Fortschritt zeigt weiterhin den aktuellen Stand.
              </p>
            ) : null}
          </div>
        </div>
        <ol
          className={`${contributionAchievementStageStyles.contributionTierTrack} ${chainStyles.contributionTierTrack}`}
          aria-label={`Stufen für ${family.label}`}
        >
          {family.stages.map((stage) => {
            const current = stage.badge_code === currentCode
            const selected = (selectedCode ?? currentCode) === stage.badge_code
            const stagePresentation = getMemberBadgePresentation(stage.badge_code)
            const stageDescriptor = stage.earned
              ? resolveProgressArtworkDescriptor(stage.badge_code)
              : undefined
            const tier = tierLabel(stage.badge_code)
            const state = current ? 'Aktuell' : stage.earned ? '' : 'Gesperrt'
            const art = stageDescriptor ? (
              <AchievementArtwork
                descriptor={stageDescriptor}
                badgeCode={stage.badge_code}
                alt=""
                size="stage"
                decorative
                className={contributionAchievementStageStyles.contributionTierArtwork}
              />
            ) : stage.earned ? (
              <stagePresentation.Icon size={32} aria-hidden="true" />
            ) : (
              <LockedStageArtwork
                className={contributionAchievementStageStyles.contributionTierArtwork}
              />
            )
            const content = (
              <>
                {art}
                <span className={contributionAchievementStageStyles.contributionTierName}>
                  {tier}
                </span>
                <span className={contributionAchievementStageStyles.contributionTierState}>
                  {state === 'Gesperrt' ? <Lock size={12} aria-hidden="true" /> : null}
                  {state}
                </span>
              </>
            )
            return (
              <li
                key={stage.badge_code}
                data-badge-code={stage.badge_code}
                data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'}
                aria-current={current ? 'step' : undefined}
              >
                {stage.earned ? (
                  <button
                    type="button"
                    aria-label={`${tier} auswählen${current ? ', Aktuell' : ''}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedCode(current ? null : stage.badge_code)}
                  >
                    {content}
                  </button>
                ) : (
                  <span aria-label={`${tier} · Gesperrt`}>{content}</span>
                )}
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}

export function ContributionProgress({ badge }: { badge: PublicMemberBadge }) {
  if (badge.badge_category !== 'contribution' || badge.current_count == null || !badge.current_tier)
    return null
  if (badge.next_threshold == null || badge.remaining_count == null || !badge.next_tier) {
    return (
      <div className={badgeChipStyles.contributionProgressTerminal}>
        <span>{badge.current_count}</span>
        <span>Höchste Stufe erreicht</span>
      </div>
    )
  }
  const percent = Math.max(
    0,
    Math.min(100, Math.round((badge.current_count / badge.next_threshold) * 100)),
  )
  return (
    <div className={badgeChipStyles.contributionProgress}>
      <div className={badgeChipStyles.contributionProgressCopy}>
        <span>
          {badge.current_count} von {badge.next_threshold}
        </span>
        <span>
          Noch {badge.remaining_count} bis {CONTRIBUTION_TIER_LABELS[badge.next_tier]}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Fortschritt bis ${CONTRIBUTION_TIER_LABELS[badge.next_tier]}`}
        aria-valuemin={0}
        aria-valuenow={badge.current_count}
        aria-valuemax={badge.next_threshold}
        className={badgeChipStyles.contributionProgressTrack}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
