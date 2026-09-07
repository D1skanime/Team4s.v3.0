'use client'

import { Lock } from 'lucide-react'
import { memo } from 'react'

import { Badge, Card, type FocalCarouselItemState } from '@/components/ui'

import { AchievementArtwork, type AchievementArtworkDescriptor } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import { LockedStageArtwork } from './AchievementStages'
import { resolveBadgeArtwork, resolveLayeredRoleArtwork } from './badgeArtwork'
import chainStyles from './MemberBadgeChain.module.css'
import type { RoleProgressPresentation } from './memberBadgeFamilies'
import { getMemberBadgePresentation, type PublicMemberBadgeCatalogItem } from './memberBadgeLabels'
import roleBadgeCardStyles from './RoleBadgeCard.module.css'
import roleBadgeCardStagesStyles from './RoleBadgeCard.stages.module.css'
import roleBadgeCardStatusStyles from './RoleBadgeCard.status.module.css'

export type RoleAchievementCardProps = {
  roleCode: string
  roleLabel: string
  colorKey: string
  count: number
  catalogItems: PublicMemberBadgeCatalogItem[]
  progress: RoleProgressPresentation
  state: FocalCarouselItemState
}

function roleArtworkDescriptor(badgeCode: string): AchievementArtworkDescriptor | undefined {
  // The current resolver keeps its legacy icon-key argument for compatibility; Plan 01's
  // role-code manifest ignores it. Keeping one uniform call here avoids role-specific branches.
  const layered = resolveLayeredRoleArtwork(badgeCode, 'user')
  if (layered) return { kind: 'layered', ...layered }
  const src = resolveBadgeArtwork(badgeCode, 'user')
  return src ? { kind: 'direct', src } : undefined
}

function RoleAchievementCardComponent({
  roleCode,
  roleLabel,
  colorKey,
  count,
  catalogItems,
  progress,
  state,
}: RoleAchievementCardProps) {
  const currentIndex = ['entry', 'bronze', 'silver', 'gold', 'platinum'].indexOf(
    progress.tier ?? '',
  )
  const artworkItem = catalogItems[Math.max(0, currentIndex)]
  const descriptor = artworkItem ? roleArtworkDescriptor(artworkItem.badge_code) : undefined
  const heroAlt = `${progress.rankLabel.split(' · ')[0]}medaille für ${roleLabel}`

  return (
    <div className={artworkStyles.container} data-role-card-container>
      <Card
        className={`${roleBadgeCardStyles.roleBadgeRow} ${roleBadgeCardStatusStyles.roleBadgeRow} ${roleBadgeCardStagesStyles.roleBadgeRow} ${chainStyles.roleBadgeRow}`}
        data-role-code={roleCode}
        data-color-key={colorKey}
        data-role-card-state={state.expanded ? 'expanded' : state.active ? 'active' : 'inactive'}
        data-active={state.active ? 'true' : 'false'}
        data-expanded={state.expanded ? 'true' : 'false'}
      >
        <h3 className={roleBadgeCardStyles.roleLabel} data-role-card-copy="label">
          {roleLabel}:
        </h3>
        {artworkItem && descriptor ? (
          <AchievementArtwork
            descriptor={descriptor}
            badgeCode={artworkItem.badge_code}
            alt={heroAlt}
            size="hero"
            className={`${roleBadgeCardStyles.roleHeroArtwork} ${roleBadgeCardStatusStyles.roleHeroArtwork}`}
          />
        ) : null}
        <div className={roleBadgeCardStatusStyles.roleStatus} data-role-card-copy="status">
          <Badge variant={getMemberBadgePresentation(artworkItem?.badge_code ?? '').variant}>
            {progress.tierLabel}
          </Badge>
          <strong className={roleBadgeCardStatusStyles.roleCount}>{count} Mitwirkungen</strong>
        </div>
        <div className={roleBadgeCardStatusStyles.roleProgressBlock} data-role-card-copy="progress">
          <div className={roleBadgeCardStatusStyles.roleProgressValue}>
            <span>
              {progress.progressValue} / {progress.progressMax}
            </span>
            <span>{Math.round(progress.progressPercent)}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Fortschritt für ${roleLabel}`}
            aria-valuemin={0}
            aria-valuenow={progress.progressValue}
            aria-valuemax={progress.progressMax}
            className={roleBadgeCardStatusStyles.roleProgressTrack}
          >
            <span style={{ width: `${progress.progressPercent}%` }} />
          </div>
          <p className={roleBadgeCardStatusStyles.roleNextCopy}>{progress.nextCopy}</p>
        </div>
        <ol
          className={roleBadgeCardStagesStyles.roleProgression}
          aria-label={`Medaillen für ${roleLabel}`}
          data-role-card-copy="stages"
        >
          {progress.stages.map((stage, index) => {
            const current = stage.state === 'current'
            const item = catalogItems[index]
            const stageDescriptor =
              item && stage.state !== 'locked' ? roleArtworkDescriptor(item.badge_code) : undefined
            return (
              <li
                key={stage.tier}
                className={
                  stage.state === 'locked'
                    ? roleBadgeCardStagesStyles.roleStageLocked
                    : roleBadgeCardStagesStyles.roleStageEarned
                }
                data-role-stage={stage.label.toLowerCase()}
                data-role-stage-state={stage.state}
                data-palette={
                  item ? getMemberBadgePresentation(item.badge_code).palette : undefined
                }
                data-role-volume={item?.badge_code.startsWith('role_volume_') ? 'true' : undefined}
                aria-current={current ? 'step' : undefined}
                aria-label={
                  stage.state === 'locked'
                    ? `${stage.label} · ${stage.threshold}+ gesperrt`
                    : undefined
                }
              >
                {stageDescriptor && item ? (
                  <AchievementArtwork
                    descriptor={stageDescriptor}
                    badgeCode={item.badge_code}
                    alt=""
                    size="stage"
                    decorative
                    className={roleBadgeCardStagesStyles.roleStageArtwork}
                  />
                ) : stage.state === 'locked' ? (
                  <LockedStageArtwork className={roleBadgeCardStagesStyles.roleStageMarker} />
                ) : (
                  <span className={roleBadgeCardStagesStyles.roleStageMarker} aria-hidden="true">
                    <Lock size={13} />
                  </span>
                )}
                <span className={roleBadgeCardStagesStyles.roleStageName}>{stage.label}</span>
                <span className={roleBadgeCardStagesStyles.roleStageThreshold}>
                  {stage.threshold}+
                </span>
                <span
                  className={`${chainStyles.currentChip} ${roleBadgeCardStagesStyles.currentChip}`}
                >
                  {current ? 'Aktuell' : ''}
                </span>
                <span className={roleBadgeCardStagesStyles.roleStageState}>
                  {stage.state === 'locked' ? 'Gesperrt' : ''}
                </span>
                <span className={chainStyles.visuallyHidden}>
                  {index === 0 ? (item?.label ?? stage.label) : ''}
                </span>
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}

export function roleAchievementCardPropsEqual(
  previous: RoleAchievementCardProps,
  next: RoleAchievementCardProps,
) {
  return (
    previous.roleCode === next.roleCode &&
    previous.roleLabel === next.roleLabel &&
    previous.colorKey === next.colorKey &&
    previous.count === next.count &&
    previous.catalogItems === next.catalogItems &&
    previous.progress === next.progress &&
    previous.state.active === next.state.active &&
    previous.state.expanded === next.state.expanded &&
    previous.state.position === next.state.position &&
    previous.state.total === next.state.total
  )
}

export const RoleAchievementCard = memo(RoleAchievementCardComponent, roleAchievementCardPropsEqual)
