'use client'

import { Lock } from 'lucide-react'

import { Card, FocalCarousel, SectionHeader } from '@/components/ui'
import { getRole, labelForRole, orderForContext, presentationForRole } from '@/lib/roleCatalog'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import type { PublicMemberBadge, PublicMemberBadgeProgress } from '@/types/profile'

import { AchievementArtwork } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import {
  AnimeProjectAchievementStage,
  ContributionAchievementStage,
  ContributionProgress,
  MembershipStage,
  PointsAchievementStage,
  resolveProgressArtworkDescriptor,
} from './AchievementStages'
import { RoleAchievementCard } from './RoleAchievementCard'
import { resolveBadgeArtwork } from './badgeArtwork'
import badgeChipStyles from './BadgeChip.module.css'
import chainStyles from './MemberBadgeChain.module.css'
import {
  resolveBadgeProgressThreshold,
  resolveMemberBadgeFamilies,
  resolveRoleProgressPresentation,
} from './memberBadgeFamilies'
import {
  MEMBER_BADGE_GROUP_LABELS,
  MEMBER_BADGE_GROUP_ORDER,
  PUBLIC_MEMBER_BADGE_CATALOG,
  getMemberBadgePresentation,
  type MemberBadgeGroup,
  type MemberBadgePresentation,
  type PublicMemberBadgeCatalogItem,
} from './memberBadgeLabels'

type MemberBadgeChainProps = {
  earnedBadges: PublicMemberBadge[]
  badgeProgress?: PublicMemberBadgeProgress[]
  catalog?: PublicMemberBadgeCatalogItem[]
}

type MemberBadgeGroupRow = {
  key: string
  items: PublicMemberBadgeCatalogItem[]
}
type MemberBadgeGroupResult = {
  key: MemberBadgeGroup
  label: string
  rows: MemberBadgeGroupRow[]
}

function resolveRoleLabel(roleRows: Parameters<typeof labelForRole>[0], roleCode: string): string {
  if (roleCode === 'other') return 'Andere'
  if (roleCode === 'admin') return 'Administration'
  if (roleCode === 'typesetter') return 'Typesetting'
  return labelForRole(roleRows, roleCode)
}

function resolveGeneralBadgeDetailLabel(
  badgeCode: string,
  badgeProgress: PublicMemberBadgeProgress[] | undefined,
): string | undefined {
  const threshold = resolveBadgeProgressThreshold(badgeProgress, badgeCode)
  if (threshold == null) return undefined
  if (badgeCode.startsWith('productive_')) return `${threshold} Anime-Projekte`
  if (badgeCode.startsWith('point_milestone_'))
    return threshold === 1 ? `${threshold} Punkt` : `${threshold} Punkte`
  return undefined
}

function catalogWithEarnedBadges(
  catalog: PublicMemberBadgeCatalogItem[],
  earnedBadges: PublicMemberBadge[],
): PublicMemberBadgeCatalogItem[] {
  const seen = new Set(catalog.map((item) => item.badge_code))
  const additions = earnedBadges
    .filter((badge) => {
      if (seen.has(badge.badge_code)) return false
      seen.add(badge.badge_code)
      return true
    })
    .map((badge) => ({
      badge_code: badge.badge_code,
      badge_category: badge.badge_category,
      label: getMemberBadgePresentation(badge.badge_code).label,
    }))
  return [...catalog, ...additions]
}

export function buildMemberBadgeGroups(
  visibleCatalog: PublicMemberBadgeCatalogItem[],
  getPresentation: (badgeCode: string) => MemberBadgePresentation = getMemberBadgePresentation,
): MemberBadgeGroupResult[] {
  return MEMBER_BADGE_GROUP_ORDER.map((groupKey) => {
    const itemsInGroup = visibleCatalog.filter(
      (item) => getPresentation(item.badge_code).group === groupKey,
    )
    let rows: MemberBadgeGroupRow[]
    if (groupKey === 'roles') {
      const rowsByKey = new Map<string, MemberBadgeGroupRow>()
      for (const item of itemsInGroup) {
        const rowKey = getPresentation(item.badge_code).roleCode ?? item.badge_code
        const existingRow = rowsByKey.get(rowKey)
        if (existingRow) existingRow.items.push(item)
        else rowsByKey.set(rowKey, { key: rowKey, items: [item] })
      }
      rows = Array.from(rowsByKey.values())
    } else
      rows = itemsInGroup.map((item) => ({
        key: item.badge_code,
        items: [item],
      }))
    return { key: groupKey, label: MEMBER_BADGE_GROUP_LABELS[groupKey], rows }
  }).filter((group) => group.rows.length > 0)
}

export function MemberBadgeChain({
  earnedBadges,
  badgeProgress,
  catalog = PUBLIC_MEMBER_BADGE_CATALOG,
}: MemberBadgeChainProps) {
  const { roles: contributionRoles } = useRoleCatalog('anime_contribution')
  const earnedCodes = new Set(earnedBadges.map((badge) => badge.badge_code))
  const earnedBadgeByCode = new Map(earnedBadges.map((badge) => [badge.badge_code, badge]))
  const roleCounts = new Map<string, number>()
  for (const badge of earnedBadges) {
    const presentation = getMemberBadgePresentation(badge.badge_code)
    if (presentation.group !== 'roles' || !presentation.roleCode) continue
    const count = badge.current_count ?? 0
    if (count < 1) continue
    roleCounts.set(
      presentation.roleCode,
      Math.max(roleCounts.get(presentation.roleCode) ?? 0, count),
    )
  }
  const roleVolumeProgressByCode = new Map(
    (badgeProgress ?? [])
      .filter((entry) => entry.family === 'role_volume' && entry.role_code)
      .map((entry) => [entry.role_code as string, entry]),
  )
  const orderedRoleCodes = orderForContext(contributionRoles, 'anime_contribution')
    .map((option) => option.code)
    .filter((roleCode) => roleCounts.has(roleCode))
  const earnedRoleCodes = new Set(orderedRoleCodes)
  const mergedCatalog = catalogWithEarnedBadges(catalog, earnedBadges)
  const generalCatalog = mergedCatalog.filter(
    (item) => getMemberBadgePresentation(item.badge_code).group !== 'roles',
  )
  const roleCatalog = orderedRoleCodes.flatMap((roleCode) => {
    const entryCode = `role_entry_${roleCode}`
    return [
      {
        badge_code: entryCode,
        badge_category: 'role_entry',
        label: getMemberBadgePresentation(entryCode).label,
      },
      ...(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
        const badgeCode = `role_volume_${roleCode}_${tier}`
        return {
          badge_code: badgeCode,
          badge_category: 'role_volume',
          label: getMemberBadgePresentation(badgeCode).label,
        }
      }),
    ]
  })
  const collectionEnabled = badgeProgress !== undefined
  const groups = buildMemberBadgeGroups([...generalCatalog, ...roleCatalog]).filter(
    (group) => !collectionEnabled || group.key === 'roles',
  )
  const families = resolveMemberBadgeFamilies({
    earned_codes: [...earnedCodes],
    badge_progress: badgeProgress ?? [],
  })
  const collectionGroups = (collectionEnabled ? MEMBER_BADGE_GROUP_ORDER : [])
    .filter(
      (group): group is Exclude<MemberBadgeGroup, 'roles'> =>
        group !== 'roles' && group !== 'special',
    )
    .map((group) => ({
      key: group,
      label: MEMBER_BADGE_GROUP_LABELS[group],
      families: families.filter((family) => family.group === group),
    }))
    .filter((group) => group.families.length > 0)

  return (
    <section className={chainStyles.section}>
      <Card variant="section" className={chainStyles.chainCard}>
        <div className={chainStyles.groupList}>
          {groups.map((group) => (
            <div key={group.key} className={chainStyles.group} data-badge-group={group.key}>
              <SectionHeader
                title={group.key === 'roles' ? 'Rollenfortschritt' : group.label}
                underline
              />
              {group.key === 'roles' ? (
                <div className={chainStyles.progressMeta}>
                  <span>
                    {earnedRoleCodes.size}{' '}
                    {earnedRoleCodes.size === 1
                      ? 'ausgeübte Fansubrolle'
                      : 'ausgeübte Fansubrollen'}
                  </span>
                </div>
              ) : null}
              <div className={chainStyles.carouselShell}>
                <div
                  className={chainStyles.carouselSkeleton}
                  aria-hidden="true"
                  data-badge-skeleton
                >
                  <span className={chainStyles.skeletonControl} />
                  <span className={chainStyles.skeletonCard} />
                  <span className={chainStyles.skeletonControl} />
                </div>
                <FocalCarousel
                  items={group.rows}
                  getItemKey={(row) => row.key}
                  regionLabel={
                    group.key === 'roles'
                      ? 'Rollenfortschritt-Karussell'
                      : `${group.label}-Karussell`
                  }
                  itemSingularLabel={group.key === 'roles' ? 'Rolle' : 'Auszeichnung'}
                  itemPluralLabel={group.key === 'roles' ? 'Rollen' : 'Auszeichnungen'}
                  listLabel={group.label}
                  previousLabel={
                    group.key === 'roles'
                      ? 'Vorherige Rolle'
                      : `Vorherige Auszeichnung in ${group.label}`
                  }
                  nextLabel={
                    group.key === 'roles'
                      ? 'Nächste Rolle'
                      : `Nächste Auszeichnung in ${group.label}`
                  }
                  showCounter={group.key === 'roles'}
                  showAllLabel={`Alle Auszeichnungen in ${group.label} anzeigen`}
                  showLessLabel="Weniger anzeigen"
                  carouselClassName={chainStyles.chain}
                  itemClassName={`${chainStyles.badgeWindow} ${artworkStyles.container}`}
                  activeItemClassName={chainStyles.badgeWindowActive}
                  gridClassName={chainStyles.badgeGrid}
                  deferInteractionUntilNearViewport
                  renderItem={(row, state) => {
                    if (group.key === 'roles') {
                      const roleDefinition = getRole(contributionRoles, row.key)
                      const rolePresentation = roleDefinition
                        ? presentationForRole(contributionRoles, row.key)
                        : undefined
                      const count = roleCounts.get(row.key) ?? 0
                      return (
                        <RoleAchievementCard
                          roleCode={row.key}
                          roleLabel={resolveRoleLabel(contributionRoles, row.key)}
                          colorKey={rolePresentation?.colorKey ?? 'other'}
                          count={count}
                          catalogItems={row.items}
                          progress={resolveRoleProgressPresentation(
                            roleVolumeProgressByCode.get(row.key),
                            count,
                          )}
                          state={state}
                        />
                      )
                    }
                    const earnedArtworkItems = row.items.filter(
                      (item) =>
                        earnedCodes.has(item.badge_code) && resolveBadgeArtwork(item.badge_code),
                    )
                    return (
                      <div
                        className={
                          earnedArtworkItems.length > 0
                            ? `${badgeChipStyles.badgeRow} ${chainStyles.badgeRow}`
                            : `${badgeChipStyles.badgeRow} ${chainStyles.badgeRow} ${badgeChipStyles.badgeRowCompact} ${chainStyles.badgeRowCompact}`
                        }
                      >
                        {row.items.map((item) => {
                          const isEarned = earnedCodes.has(item.badge_code)
                          const presentation = getMemberBadgePresentation(item.badge_code)
                          const descriptor = resolveProgressArtworkDescriptor(item.badge_code)
                          const earnedBadge = earnedBadgeByCode.get(item.badge_code)
                          const detailLabel = resolveGeneralBadgeDetailLabel(
                            item.badge_code,
                            badgeProgress,
                          )
                          return (
                            <span
                              key={item.badge_code}
                              className={
                                isEarned
                                  ? `${badgeChipStyles.badgeStep} ${chainStyles.badgeStep}`
                                  : badgeChipStyles.badgeStepLocked
                              }
                              data-palette={presentation.palette}
                              data-earned={isEarned ? 'true' : 'false'}
                              data-contribution-tier={earnedBadge?.current_tier ?? undefined}
                              data-role-volume={
                                item.badge_code.startsWith('role_volume_') ? 'true' : undefined
                              }
                            >
                              <span
                                className={
                                  descriptor && isEarned
                                    ? badgeChipStyles.badgeItemWithImage
                                    : badgeChipStyles.badgeItem
                                }
                              >
                                {descriptor && isEarned ? (
                                  <AchievementArtwork
                                    descriptor={descriptor}
                                    badgeCode={item.badge_code}
                                    alt=""
                                    size="hero"
                                    decorative
                                    className={`${badgeChipStyles.badgeArtwork} ${chainStyles.badgeArtwork}`}
                                  />
                                ) : (
                                  <span
                                    className={badgeChipStyles.badgeIcon}
                                    aria-label={isEarned ? undefined : `${item.label} gesperrt`}
                                  >
                                    {isEarned ? (
                                      <presentation.Icon size={24} aria-hidden="true" />
                                    ) : (
                                      <Lock size={20} aria-hidden="true" />
                                    )}
                                  </span>
                                )}
                                <span className={badgeChipStyles.badgeText}>
                                  <span>{item.label}</span>
                                  {detailLabel ? (
                                    <span className={badgeChipStyles.badgeDetail}>
                                      {detailLabel}
                                    </span>
                                  ) : null}
                                </span>
                                {isEarned && earnedBadge ? (
                                  <ContributionProgress badge={earnedBadge} />
                                ) : null}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                    )
                  }}
                />
              </div>
            </div>
          ))}
          {collectionGroups.map((group) => (
            <div key={group.key} className={chainStyles.group} data-badge-group={group.key}>
              <SectionHeader title={group.label} underline />
              {group.key === 'progress' ? (
                <AnimeProjectAchievementStage family={group.families[0]} />
              ) : group.key === 'points' ? (
                <PointsAchievementStage family={group.families[0]} />
              ) : group.key === 'membership' ? (
                <MembershipStage family={group.families[0]} />
              ) : (
                <div className={chainStyles.carouselShell}>
                  <FocalCarousel
                    items={group.families}
                    getItemKey={(family) => family.key}
                    regionLabel={`${group.label}-Karussell`}
                    itemSingularLabel="Sammlung"
                    itemPluralLabel="Sammlungen"
                    listLabel={group.label}
                    previousLabel="Vorherige Sammlung"
                    nextLabel="Nächste Sammlung"
                    showCounter={group.families.length > 1}
                    showAllLabel={`Alle Auszeichnungen in ${group.label} anzeigen`}
                    showLessLabel="Weniger anzeigen"
                    formatCounter={(position, total) => `${position} von ${total} Sammlungen`}
                    carouselClassName={chainStyles.chain}
                    itemClassName={`${chainStyles.badgeWindow} ${artworkStyles.container}`}
                    activeItemClassName={chainStyles.badgeWindowActive}
                    deferInteractionUntilNearViewport
                    renderItem={(family) => <ContributionAchievementStage family={family} />}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
