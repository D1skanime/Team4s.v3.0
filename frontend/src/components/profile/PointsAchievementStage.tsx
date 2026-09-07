'use client'

import { Lock } from 'lucide-react'

import { Badge, Card } from '@/components/ui'

import { AchievementArtwork } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import chainStyles from './MemberBadgeChain.module.css'
import pointsAchievementStageStyles from './PointsAchievementStage.module.css'
import type { MemberBadgeFamilyPresentation } from './memberBadgeFamilies'
import { getMemberBadgePresentation } from './memberBadgeLabels'
import {
  useFamilyPreview,
  LockedStageArtwork,
  resolveProgressArtworkDescriptor,
} from './achievementStageHelpers'

const POINT_NUMBER_FORMATTER = new Intl.NumberFormat('de-CH')

export function PointsAchievementStage({ family }: { family: MemberBadgeFamilyPresentation }) {
  const [selectedCode, setSelectedCode] = useFamilyPreview(family)
  const currentCode = family.currentStage?.badge_code ?? null
  const selectedStage = family.stages.find(
    (stage) =>
      stage.badge_code === selectedCode && stage.earned && stage.badge_code !== currentCode,
  )
  const heroStage = selectedStage ?? family.heroStage
  const presentation = getMemberBadgePresentation(heroStage.badge_code)
  const descriptor = resolveProgressArtworkDescriptor(heroStage.badge_code)
  const count = family.currentCount ?? 0
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(count, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const nextLabel = family.nextStage
    ? getMemberBadgePresentation(family.nextStage.badge_code).label
    : null
  // Node and Chromium ship different de-CH grouping glyphs; keep hydration text stable.
  const formatPoints = (value: number) => POINT_NUMBER_FORMATTER.format(value).replaceAll("'", '’')

  return (
    <div className={artworkStyles.container}>
      <Card
        className={`${pointsAchievementStageStyles.pointsAchievementStage} ${chainStyles.pointsAchievementStage}`}
        data-family={family.key}
        data-points-achievement-stage
      >
        <div className={pointsAchievementStageStyles.pointsStageHero}>
          <span>
            {currentCode ? (
              descriptor ? (
                <AchievementArtwork
                  descriptor={descriptor}
                  badgeCode={heroStage.badge_code}
                  alt={heroStage.label}
                  size="hero"
                  className={pointsAchievementStageStyles.pointsHeroArtwork}
                />
              ) : (
                <presentation.Icon size={96} aria-label={heroStage.label} />
              )
            ) : (
              <LockedStageArtwork hero />
            )}
          </span>
          <div className={pointsAchievementStageStyles.pointsStageInfo} aria-live="polite">
            {currentCode ? (
              <div className={pointsAchievementStageStyles.pointsStageStatus}>
                <Badge variant={presentation.variant}>{presentation.label}</Badge>
                {selectedStage ? <Badge variant="info">Vorschau</Badge> : null}
              </div>
            ) : null}
            <strong className={pointsAchievementStageStyles.pointsStageCount}>
              {formatPoints(count)} Punkte{selectedStage ? ' aktuell' : ''}
            </strong>
            <div className={pointsAchievementStageStyles.pointsProgressValue}>
              <span>
                {formatPoints(progressValue)} / {formatPoints(progressMax)}
              </span>
              <span>{Math.round(progressPercent)} %</span>
            </div>
            <div
              role="progressbar"
              aria-label="Fortschritt für Punkte"
              aria-valuemin={0}
              aria-valuenow={progressValue}
              aria-valuemax={progressMax}
              className={pointsAchievementStageStyles.pointsProgressTrack}
            >
              <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
            </div>
            <p className={pointsAchievementStageStyles.pointsStageNext}>
              {family.complete
                ? 'Höchste Stufe erreicht'
                : `Noch ${formatPoints(family.remainingCount ?? 0)} Punkte bis ${nextLabel}`}
            </p>
          </div>
        </div>
        <ol
          className={pointsAchievementStageStyles.pointsStageTrack}
          aria-label="Punkte-Meilensteine"
        >
          {family.stages.map((stage) => {
            const current = stage.badge_code === currentCode
            const selected = stage.badge_code === selectedCode
            const stagePresentation = getMemberBadgePresentation(stage.badge_code)
            const stageDescriptor = stage.earned
              ? resolveProgressArtworkDescriptor(stage.badge_code)
              : undefined
            const art = stageDescriptor ? (
              <AchievementArtwork
                descriptor={stageDescriptor}
                badgeCode={stage.badge_code}
                alt=""
                size="stage"
                decorative
                className={pointsAchievementStageStyles.pointsStageArtwork}
              />
            ) : stage.earned ? (
              <stagePresentation.Icon size={32} aria-hidden="true" />
            ) : (
              <LockedStageArtwork className={pointsAchievementStageStyles.pointsStageArtwork} />
            )
            const content = (
              <>
                {art}
                <span className={pointsAchievementStageStyles.pointsStageName}>
                  Stufe: {stagePresentation.label}
                </span>
                <span className={pointsAchievementStageStyles.pointsStageThreshold}>
                  Ab {formatPoints(stage.threshold)} Punkten
                </span>
                <span className={pointsAchievementStageStyles.pointsStageState}>
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
                {stage.earned && !current ? (
                  <button
                    type="button"
                    aria-label={`${stagePresentation.label} auswählen`}
                    aria-pressed={selected}
                    onClick={() => setSelectedCode(stage.badge_code)}
                  >
                    {content}
                  </button>
                ) : (
                  <span
                    aria-label={`${stagePresentation.label} · ${current ? 'Aktuell' : 'Gesperrt'}`}
                  >
                    {content}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}
