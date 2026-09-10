'use client'

import { Badge, Card } from '@/components/ui'

import { AchievementArtwork } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import chainStyles from './MemberBadgeChain.module.css'
import animeProjectStageStyles from './AnimeProjectStage.module.css'
import type { MemberBadgeFamilyPresentation } from './memberBadgeFamilies'
import { getMemberBadgePresentation } from './memberBadgeLabels'
import {
  useFamilyPreview,
  LockedStageArtwork,
  resolveProgressArtworkDescriptor,
} from './achievementStageHelpers'

export function AnimeProjectAchievementStage({
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
  const rank = presentation.label.split(' · ').at(-1) ?? presentation.label
  const nextRank = family.nextStage
    ? (getMemberBadgePresentation(family.nextStage.badge_code).label.split(' · ').at(-1) ??
      family.nextStage.label)
    : null

  return (
    <div className={artworkStyles.container}>
      <Card
        className={`${animeProjectStageStyles.animeProjectStage} ${chainStyles.animeProjectStage}`}
        data-family={family.key}
        data-anime-project-stage
      >
        <h3 className={animeProjectStageStyles.animeProjectTitle}>Anime-Projekte</h3>
        <div className={animeProjectStageStyles.animeProjectHero}>
          <span data-anime-project-art={heroStage.badge_code}>
            {currentCode ? (
              descriptor ? (
                <AchievementArtwork
                  descriptor={descriptor}
                  badgeCode={heroStage.badge_code}
                  alt={heroStage.label}
                  size="hero"
                  className={`${animeProjectStageStyles.animeProjectArtwork} ${chainStyles.animeProjectArtwork}`}
                />
              ) : (
                <presentation.Icon size={96} aria-label={heroStage.label} />
              )
            ) : (
              <LockedStageArtwork hero />
            )}
          </span>
          <div className={animeProjectStageStyles.animeProjectInfo} aria-live="polite">
            <div className={animeProjectStageStyles.animeProjectStatus}>
              <Badge variant={presentation.variant}>{rank}</Badge>
              {selectedStage ? <Badge variant="info">Vorschau</Badge> : null}
            </div>
            <strong className={animeProjectStageStyles.animeProjectCount}>
              {count} {unit}
            </strong>
            <div className={animeProjectStageStyles.animeProjectProgressValue}>
              <span>
                {progressValue} / {progressMax}
              </span>
              <span>{Math.round(progressPercent)} %</span>
            </div>
            <div
              role="progressbar"
              aria-label="Fortschritt für Anime-Projekte"
              aria-valuemin={0}
              aria-valuenow={count}
              aria-valuemax={progressMax}
              className={animeProjectStageStyles.animeProjectProgressTrack}
            >
              <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
            </div>
            <p className={animeProjectStageStyles.animeProjectNext}>
              {family.complete
                ? 'Höchste Stufe erreicht'
                : `Noch ${family.remainingCount ?? 0} Anime-Projekte bis ${nextRank}`}
            </p>
            {selectedStage ? (
              <p className={chainStyles.visuallyHidden}>
                Vorschau der bereits erreichten Stufe {rank}. Der Fortschritt zeigt weiterhin den
                aktuellen Stand.
              </p>
            ) : null}
          </div>
        </div>
        <ol
          className={`${animeProjectStageStyles.animeProjectMilestones} ${chainStyles.animeProjectMilestones}`}
          aria-label="Stufen für Anime-Projekte"
        >
          {family.stages.map((stage) => {
            const current = stage.badge_code === currentCode
            const selected = stage.badge_code === selectedCode
            const stagePresentation = getMemberBadgePresentation(stage.badge_code)
            const label =
              stage.badge_code === 'first_contribution'
                ? 'Erste Mitwirkung'
                : (stagePresentation.label.split(' · ').at(-1) ?? stagePresentation.label)
            const stageDescriptor = stage.earned
              ? resolveProgressArtworkDescriptor(stage.badge_code)
              : undefined
            const marker = stageDescriptor ? (
              <AchievementArtwork
                descriptor={stageDescriptor}
                badgeCode={stage.badge_code}
                alt=""
                size="stage"
                decorative
                className={animeProjectStageStyles.animeProjectMarker}
              />
            ) : stage.earned ? (
              <span className={animeProjectStageStyles.animeProjectMarker} aria-hidden="true">
                {current ? '★' : '●'}
              </span>
            ) : (
              <LockedStageArtwork className={animeProjectStageStyles.animeProjectMarker} />
            )
            const content = (
              <>
                {marker}
                <span className={animeProjectStageStyles.animeProjectMilestoneName}>{label}</span>
                <span className={animeProjectStageStyles.animeProjectThreshold}>
                  {stage.threshold}
                </span>
                {current ? <span className={chainStyles.currentChip}>Aktuell</span> : null}
                {!stage.earned ? (
                  <span className={chainStyles.visuallyHidden}>Gesperrt</span>
                ) : null}
              </>
            )
            return (
              <li
                key={stage.badge_code}
                data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'}
                aria-current={current ? 'step' : undefined}
              >
                {stage.earned ? (
                  <button
                    type="button"
                    aria-label={`${stage.badge_code === 'first_contribution' ? label : `${stage.threshold} Anime-Projekte`} auswählen${current ? ', Aktuell' : ''}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedCode(current ? null : stage.badge_code)}
                  >
                    {content}
                  </button>
                ) : (
                  <span aria-label={`${stage.threshold} Anime-Projekte · Gesperrt`}>{content}</span>
                )}
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}
