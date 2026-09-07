'use client'

import { Lock } from 'lucide-react'

import { Badge, Card } from '@/components/ui'

import { AchievementArtwork } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import chainStyles from './MemberBadgeChain.module.css'
import membershipStageStyles from './MembershipStage.module.css'
import type { MemberBadgeFamilyPresentation } from './memberBadgeFamilies'
import { getMemberBadgePresentation } from './memberBadgeLabels'
import {
  useFamilyPreview,
  LockedStageArtwork,
  resolveProgressArtworkDescriptor,
} from './achievementStageHelpers'

export function MembershipStage({ family }: { family: MemberBadgeFamilyPresentation }) {
  const [selectedCode, setSelectedCode] = useFamilyPreview(family)
  const currentCode = family.currentStage?.badge_code ?? null
  const foundingPreview = selectedCode === family.foundingStage?.badge_code
  const selectedStage = family.stages.find(
    (stage) =>
      stage.badge_code === selectedCode && stage.earned && stage.badge_code !== currentCode,
  )
  const heroStage = foundingPreview ? family.foundingStage! : (selectedStage ?? family.heroStage)
  const presentation = getMemberBadgePresentation(heroStage.badge_code)
  const descriptor = resolveProgressArtworkDescriptor(heroStage.badge_code)
  const count = family.currentCount ?? 0
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(count, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const nextLabel = family.nextStage ? `${family.nextStage.threshold} Jahre` : null

  return (
    <div className={artworkStyles.container}>
      <Card
        className={`${membershipStageStyles.membershipStage} ${chainStyles.membershipStage}`}
        data-family={family.key}
        data-membership-stage
      >
        <div className={membershipStageStyles.membershipStageHero}>
          <span data-membership-art={heroStage.badge_code}>
            {currentCode || foundingPreview ? (
              descriptor ? (
                <AchievementArtwork
                  descriptor={descriptor}
                  badgeCode={heroStage.badge_code}
                  alt={heroStage.label}
                  size="hero"
                  className={membershipStageStyles.membershipHeroArtwork}
                />
              ) : (
                <presentation.Icon size={96} aria-label={heroStage.label} />
              )
            ) : (
              <LockedStageArtwork hero />
            )}
          </span>
          <div className={membershipStageStyles.membershipStageInfo} aria-live="polite">
            <h3 className={membershipStageStyles.membershipHeroTitle}>
              {foundingPreview ? 'Besondere Mitgliedschaft' : 'Mitgliedsdauer'}
            </h3>
            <div className={membershipStageStyles.membershipStageStatus}>
              <Badge variant={currentCode || foundingPreview ? presentation.variant : 'muted'}>
                {foundingPreview ? 'Gründungsmitglied' : presentation.label}
              </Badge>
              <Badge
                variant={
                  foundingPreview || selectedStage ? 'info' : currentCode ? 'success' : 'muted'
                }
              >
                {foundingPreview || selectedStage
                  ? 'Vorschau'
                  : currentCode
                    ? 'Aktuell'
                    : 'Gesperrt'}
              </Badge>
            </div>
            {foundingPreview ? (
              <p className={membershipStageStyles.membershipHeroDescription}>
                Seit der Gründung dabei
              </p>
            ) : null}
            <strong className={membershipStageStyles.membershipStageCount}>
              {count} {count === 1 ? family.unitSingular : family.unitPlural}
            </strong>
            <div className={membershipStageStyles.membershipProgressValue}>
              <span>
                {progressValue} / {progressMax}
              </span>
              <span>{Math.round(progressPercent)} %</span>
            </div>
            <div
              role="progressbar"
              aria-label="Fortschritt für Mitgliedschaft"
              aria-valuemin={0}
              aria-valuenow={progressValue}
              aria-valuemax={progressMax}
              className={membershipStageStyles.membershipProgressTrack}
            >
              <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
            </div>
            <p className={membershipStageStyles.membershipStageNext}>
              {family.complete
                ? 'Höchste Stufe erreicht'
                : `Noch ${family.remainingCount ?? 0} ${family.remainingCount === 1 ? 'Jahr' : 'Jahre'} bis ${nextLabel}`}
            </p>
            {foundingPreview || selectedStage ? (
              <p className={chainStyles.visuallyHidden}>
                Vorschau einer bereits erreichten Mitgliedschaftsauszeichnung. Der Fortschritt zeigt
                weiterhin den aktuellen Stand.
              </p>
            ) : null}
          </div>
        </div>
        <ol
          className={membershipStageStyles.membershipDurationTrack}
          aria-label="Dauerstufen der Mitgliedschaft"
          data-membership-duration-track
        >
          {family.stages.map((stage) => {
            const current = stage.badge_code === currentCode
            const selected = stage.badge_code === selectedCode || (selectedCode === null && current)
            const stageDescriptor = stage.earned
              ? resolveProgressArtworkDescriptor(stage.badge_code)
              : undefined
            const stagePresentation = getMemberBadgePresentation(stage.badge_code)
            const label = `${stage.threshold} Jahre Mitgliedschaft`
            const art = stageDescriptor ? (
              <AchievementArtwork
                descriptor={stageDescriptor}
                badgeCode={stage.badge_code}
                alt=""
                size="stage"
                decorative
                className={membershipStageStyles.membershipStageArtwork}
              />
            ) : stage.earned ? (
              <stagePresentation.Icon size={32} aria-hidden="true" />
            ) : (
              <LockedStageArtwork className={membershipStageStyles.membershipStageArtwork} />
            )
            const content = (
              <>
                {art}
                <span className={membershipStageStyles.membershipStageName}>
                  {stage.threshold} Jahre
                </span>
                <span className={membershipStageStyles.membershipStageState}>
                  {current ? (
                    'Aktuell'
                  ) : stage.earned ? (
                    'Erreicht'
                  ) : (
                    <>
                      <Lock size={12} aria-hidden="true" /> Gesperrt
                    </>
                  )}
                </span>
              </>
            )
            return (
              <li
                key={stage.badge_code}
                data-badge-code={stage.badge_code}
                data-threshold={stage.threshold}
                data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'}
                aria-current={current ? 'step' : undefined}
              >
                {stage.earned ? (
                  <button
                    type="button"
                    aria-label={`${label} auswählen${current ? ', Aktuell' : ''}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedCode(current ? null : stage.badge_code)}
                  >
                    {content}
                  </button>
                ) : (
                  <span aria-label={`${label} · Gesperrt`}>{content}</span>
                )}
              </li>
            )
          })}
        </ol>
        {family.foundingStage ? (
          <aside
            className={membershipStageStyles.foundingMemberPanel}
            data-founding-member
            aria-label="Besondere Mitgliedschaft"
          >
            <button
              type="button"
              className={membershipStageStyles.foundingMemberButton}
              aria-label="Gründungsmitglied Vorschau"
              aria-pressed={foundingPreview}
              onClick={() =>
                setSelectedCode(foundingPreview ? null : family.foundingStage!.badge_code)
              }
            >
              <span className={membershipStageStyles.foundingMemberArtwork}>
                {!foundingPreview &&
                resolveProgressArtworkDescriptor(family.foundingStage.badge_code) ? (
                  <AchievementArtwork
                    descriptor={resolveProgressArtworkDescriptor(family.foundingStage.badge_code)!}
                    badgeCode={family.foundingStage.badge_code}
                    alt=""
                    size="stage"
                    decorative
                  />
                ) : null}
              </span>
              <span className={membershipStageStyles.foundingMemberCopy}>
                <strong>Besondere Mitgliedschaft</strong>
                <span className={membershipStageStyles.foundingMemberLabel}>Gründungsmitglied</span>
                <span className={membershipStageStyles.foundingMemberDescription}>
                  Seit der Gründung dabei
                </span>
              </span>
            </button>
          </aside>
        ) : null}
      </Card>
    </div>
  )
}
