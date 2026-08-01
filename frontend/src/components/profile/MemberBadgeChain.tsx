'use client'

import Image from 'next/image'
import { Lock } from 'lucide-react'

import { Card, FocalCarousel, SectionHeader } from '@/components/ui'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import type { PublicMemberBadge } from '@/types/profile'

import {
  MEMBER_BADGE_GROUP_LABELS,
  MEMBER_BADGE_GROUP_ORDER,
  PUBLIC_MEMBER_BADGE_CATALOG,
  getMemberBadgePresentation,
  type MemberBadgeGroup,
  type MemberBadgePresentation,
  type PublicMemberBadgeCatalogItem,
} from './memberBadgeLabels'
import styles from './MemberBadgeChain.module.css'

type MemberBadgeChainProps = {
  earnedBadges: PublicMemberBadge[]
  catalog?: PublicMemberBadgeCatalogItem[]
  relevantRoleCodes?: string[]
}

// D-04: eine Zeile innerhalb einer Kategorie-Gruppe -- normalerweise ein Badge, aber die
// Rollen-Gruppe fasst alle Badges mit demselben roleCode zu einer Zeile zusammen (Phase 112
// Typ 3 dockt hier ohne Umbau an).
type MemberBadgeGroupRow = {
  key: string
  items: PublicMemberBadgeCatalogItem[]
}

type MemberBadgeGroupResult = {
  key: MemberBadgeGroup
  label: string
  rows: MemberBadgeGroupRow[]
}

// Phase 112 D-04: loest den deutschen Rollennamen fuer den Zeilen-Praefix ueber die
// Single-Source-of-Truth-Rollenliste auf; Fallback auf den rohen Code (defensiv, gleiches
// Muster wie getMemberBadgePresentation's bestehender Fallback).
function resolveRoleLabel(roleCode: string): string {
  if (roleCode === 'other') return 'Andere'
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === roleCode)?.label ?? roleCode
}

const CONTRIBUTION_TIER_LABELS = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold' } as const

function ContributionProgress({ badge }: { badge: PublicMemberBadge }) {
  if (badge.badge_category !== 'contribution' || badge.current_count == null || !badge.current_tier) return null
  if (badge.next_threshold == null || badge.remaining_count == null || !badge.next_tier) {
    return <div className={styles.contributionProgressTerminal}><span>{badge.current_count}</span><span>Höchste Stufe erreicht</span></div>
  }
  const percent = Math.max(0, Math.min(100, Math.round((badge.current_count / badge.next_threshold) * 100)))
  return <div className={styles.contributionProgress}>
    <div className={styles.contributionProgressCopy}><span>{badge.current_count} von {badge.next_threshold}</span><span>Noch {badge.remaining_count} bis {CONTRIBUTION_TIER_LABELS[badge.next_tier]}</span></div>
    <div role="progressbar" aria-label={`Fortschritt bis ${CONTRIBUTION_TIER_LABELS[badge.next_tier]}`} aria-valuemin={0} aria-valuenow={badge.current_count} aria-valuemax={badge.next_threshold} className={styles.contributionProgressTrack}><span style={{ width: `${percent}%` }} /></div>
  </div>
}

const VERSIONED_POINT_ARTWORK = new Set([
  'point_milestone_first',
  'point_milestone_active',
  'point_milestone_engaged',
  'point_milestone_experienced',
  'point_milestone_legend',
  'point_milestone_veteran',
])

const APPROVED_CONTRIBUTION_ARTWORK: Record<string, string> = {
  contribution_projects_bronze: 'contribution_projects_bronze-v3.png',
  contribution_projects_silver: 'contribution_projects_silver-v2.png',
  contribution_projects_gold: 'contribution_projects_gold-v2.png',
  contribution_chronicle_bronze: 'contribution_chronicle_bronze-v4.png',
  contribution_chronicle_silver: 'contribution_chronicle_silver-v2.png',
  contribution_chronicle_gold: 'contribution_chronicle_gold-v2.png',
  contribution_archivist_bronze: 'contribution_archivist_bronze-v2.png',
  contribution_archivist_silver: 'contribution_archivist_silver-v2.png',
  contribution_archivist_gold: 'contribution_archivist_gold-v2.png',
}

const APPROVED_MEMBERSHIP_ARTWORK: Record<string, string> = {
  founding_member: 'membership-founding_member-v4.png',
  long_term_member: 'membership-long_term_member-v4.png',
  membership_7_years: 'membership-7_years-v4.png',
  membership_10_years: 'membership-10_years-v4.png',
}

const APPROVED_SPECIAL_ARTWORK: Record<string, string> = {
  historical_leader: 'special-historical_leader-v1.png',
}

function resolveBadgeArtwork(badgeCode: string): string | undefined {
  if (badgeCode === 'first_contribution') {
    return '/member-achievement-badges/progress-frame-first_contribution.png'
  }
  if (badgeCode === 'point_milestone_veteran') {
    return '/member-achievement-badges/point_milestone_veteran-v3.png'
  }
  const productiveMatch = /^productive_(bronze|silver|gold)$/.exec(badgeCode)
  if (productiveMatch) {
    return `/member-achievement-badges/progress-frame-productive-${productiveMatch[1]}.png`
  }
  if (VERSIONED_POINT_ARTWORK.has(badgeCode)) {
    return `/member-achievement-badges/${badgeCode}-v2.png`
  }
  if (APPROVED_CONTRIBUTION_ARTWORK[badgeCode]) {
    return `/member-achievement-badges/${APPROVED_CONTRIBUTION_ARTWORK[badgeCode]}`
  }
  if (APPROVED_MEMBERSHIP_ARTWORK[badgeCode]) {
    return `/member-achievement-badges/${APPROVED_MEMBERSHIP_ARTWORK[badgeCode]}`
  }
  if (APPROVED_SPECIAL_ARTWORK[badgeCode]) {
    return `/member-achievement-badges/${APPROVED_SPECIAL_ARTWORK[badgeCode]}`
  }
  if (badgeCode.startsWith('contribution_')) {
    return `/member-achievement-badges/${badgeCode}.png`
  }
  if (badgeCode.startsWith('role_entry_')) {
    return `/member-achievement-badges/${badgeCode}.png`
  }
  const roleVolumeMatch = /^role_volume_(.+)_(?:bronze|silver|gold|platinum)$/.exec(badgeCode)
  if (roleVolumeMatch?.[1] === 'timer') {
    return `/member-achievement-badges/${badgeCode}.png`
  }
  return roleVolumeMatch
    ? `/member-achievement-badges/role_entry_${roleVolumeMatch[1]}.png`
    : undefined
}

function resolveLayeredProgressArtwork(
  badgeCode: string,
): { motifSrc: string; frameSrc: string } | undefined {
  if (badgeCode === 'first_contribution') {
    return {
      motifSrc: '/member-achievement-badges/progress-first_contribution-motif.png',
      frameSrc: '/member-achievement-badges/progress-frame-first_contribution.png',
    }
  }
  const productiveMatch = /^productive_(bronze|silver|gold)$/.exec(badgeCode)
  if (!productiveMatch) return undefined
  return {
    motifSrc: '/member-achievement-badges/progress-productive-motif.png',
    frameSrc: `/member-achievement-badges/progress-frame-productive-${productiveMatch[1]}.png`,
  }
}

function resolveLayeredRoleArtwork(
  badgeCode: string,
): { motifSrc: string; frameSrc: string } | undefined {
  const match = /^role_volume_(translator|timer|encoder|typesetter|quality_checker|project_lead|editor|raw_provider|designer|admin|other)_(bronze|silver|gold|platinum)$/.exec(badgeCode)
  if (!match) return undefined

  const [, role, rank] = match
  return {
    motifSrc: `/member-achievement-badges/role-${role}-motif.png`,
    frameSrc: `/member-achievement-badges/rank-frame-${role}-${rank}.png`,
  }
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

// D-04: baut die erweiterbare, kategorie-gruppierte Struktur der "Auszeichnungen"-Sektion.
// Pure Funktion, injectable Presentation-Lookup -- so bleibt die Gruppierung ohne Rendering
// unit-testbar. Leere Kategorien werden nicht zurueckgegeben (kein Umbau bei neuen Badge-Typen).
export function buildMemberBadgeGroups(
  visibleCatalog: PublicMemberBadgeCatalogItem[],
  getPresentation: (badgeCode: string) => MemberBadgePresentation = getMemberBadgePresentation,
): MemberBadgeGroupResult[] {
  return MEMBER_BADGE_GROUP_ORDER.map((groupKey) => {
    const itemsInGroup = visibleCatalog.filter((item) => getPresentation(item.badge_code).group === groupKey)

    let rows: MemberBadgeGroupRow[]
    if (groupKey === 'roles') {
      const rowsByKey = new Map<string, MemberBadgeGroupRow>()
      for (const item of itemsInGroup) {
        const rowKey = getPresentation(item.badge_code).roleCode ?? item.badge_code
        const existingRow = rowsByKey.get(rowKey)
        if (existingRow) {
          existingRow.items.push(item)
        } else {
          rowsByKey.set(rowKey, { key: rowKey, items: [item] })
        }
      }
      rows = Array.from(rowsByKey.values())
    } else {
      rows = itemsInGroup.map((item) => ({ key: item.badge_code, items: [item] }))
    }

    return { key: groupKey, label: MEMBER_BADGE_GROUP_LABELS[groupKey], rows }
  }).filter((group) => group.rows.length > 0)
}

export function MemberBadgeChain({
  earnedBadges,
  catalog = PUBLIC_MEMBER_BADGE_CATALOG,
  relevantRoleCodes,
}: MemberBadgeChainProps) {
  const earnedCodes = new Set(earnedBadges.map((badge) => badge.badge_code))
  const earnedRoleCodes = earnedBadges
    .map((badge) => getMemberBadgePresentation(badge.badge_code).roleCode)
    .filter((roleCode): roleCode is string => Boolean(roleCode))
  const visibleRoleCodes = new Set([...(relevantRoleCodes ?? []), ...earnedRoleCodes])
  const visibleCatalog = catalogWithEarnedBadges(catalog, earnedBadges).filter((item) => {
    const presentation = getMemberBadgePresentation(item.badge_code)
    return presentation.group !== 'roles'
      || Boolean(presentation.roleCode && visibleRoleCodes.has(presentation.roleCode))
  })
  const earnedCount = visibleCatalog.filter((item) => earnedCodes.has(item.badge_code)).length
  const progressPercent = visibleCatalog.length > 0
    ? Math.round((earnedCount / visibleCatalog.length) * 100)
    : 0
  const groups = buildMemberBadgeGroups(visibleCatalog)

  return (
    <section className={styles.section}>
      <SectionHeader title="Auszeichnungen" />

      <Card variant="section" className={styles.chainCard}>
        <div className={styles.progressBlock} aria-label={`${earnedCount} von ${visibleCatalog.length} Auszeichnungen`}>
          <div className={styles.progressMeta}>
            <span>{earnedCount} von {visibleCatalog.length}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className={styles.groupList}>
          {groups.map((group) => (
            <div key={group.key} className={styles.group} data-badge-group={group.key}>
              <h3 className={styles.groupTitle}>{group.label}</h3>
              <FocalCarousel
                items={group.rows}
                getItemKey={(row) => row.key}
                regionLabel={`${group.label}-Karussell`}
                itemSingularLabel="Auszeichnung"
                itemPluralLabel="Auszeichnungen"
                listLabel={group.label}
                previousLabel={`Vorherige Auszeichnung in ${group.label}`}
                nextLabel={`Nächste Auszeichnung in ${group.label}`}
                showAllLabel={`Alle Auszeichnungen in ${group.label} anzeigen`}
                showLessLabel="Weniger anzeigen"
                carouselClassName={styles.chain}
                itemClassName={styles.badgeWindow}
                activeItemClassName={styles.badgeWindowActive}
                gridClassName={styles.badgeGrid}
                renderItem={(row) => {
                  const earnedArtworkItems = row.items.filter(
                    (item) => earnedCodes.has(item.badge_code) && resolveBadgeArtwork(item.badge_code),
                  )

                  if (group.key === 'roles') {
                    const artworkItem = earnedArtworkItems.find((item) => item.badge_code.startsWith('role_volume_'))
                      ?? earnedArtworkItems[0]
                    const artworkSrc = artworkItem ? resolveBadgeArtwork(artworkItem.badge_code) : undefined
                    const layeredRoleArtwork = artworkItem
                      ? resolveLayeredRoleArtwork(artworkItem.badge_code)
                      : undefined

                    return (
                      <div
                        className={`${artworkSrc ? styles.roleBadgeRow : styles.roleBadgeRowCompact} ${layeredRoleArtwork ? styles.roleBadgeRowLayered : ''}`}
                        data-role-code={row.key}
                      >
                        <span className={styles.roleLabel}>{resolveRoleLabel(row.key)}:</span>
                        {artworkItem && artworkSrc ? (
                          <span
                            className={`${styles.roleHeroArtwork} ${layeredRoleArtwork ? styles.roleHeroArtworkLayered : ''}`}
                          >
                            {layeredRoleArtwork ? (
                              <>
                                <span className={styles.roleArtworkMist} aria-hidden="true" />
                                <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
                                <Image
                                  className={styles.roleArtworkMotif}
                                  src={layeredRoleArtwork.motifSrc}
                                  alt=""
                                  width={1254}
                                  height={1254}
                                  sizes="(max-width: 520px) 230px, (max-width: 900px) 280px, 328px"
                                  unoptimized
                                  aria-hidden="true"
                                />
                                <Image
                                  className={styles.roleArtworkFrame}
                                  src={layeredRoleArtwork.frameSrc}
                                  alt=""
                                  width={1254}
                                  height={1254}
                                  sizes="(max-width: 520px) 230px, (max-width: 900px) 280px, 328px"
                                  unoptimized
                                  aria-hidden="true"
                                  data-achievement-art={artworkItem.badge_code}
                                />
                              </>
                            ) : (
                              <Image
                                src={artworkSrc}
                                alt=""
                                width={512}
                                height={512}
                                sizes="(max-width: 520px) 230px, (max-width: 900px) 280px, 328px"
                                unoptimized
                                aria-hidden="true"
                                data-achievement-art={artworkItem.badge_code}
                              />
                            )}
                          </span>
                        ) : null}
                        <span className={styles.roleProgression} aria-label={`Fortschritt für ${resolveRoleLabel(row.key)}`}>
                          {row.items.map((item) => {
                            const isEarned = earnedCodes.has(item.badge_code)
                            const presentation = getMemberBadgePresentation(item.badge_code)

                            return (
                              <span
                                key={item.badge_code}
                                className={isEarned ? styles.roleStageEarned : styles.roleStageLocked}
                                data-palette={presentation.palette}
                                data-earned={isEarned ? 'true' : 'false'}
                                data-role-volume={item.badge_code.startsWith('role_volume_') ? 'true' : undefined}
                                aria-label={!isEarned ? `${item.label} gesperrt` : undefined}
                              >
                                {!isEarned ? <Lock size={14} aria-hidden="true" /> : null}
                                {item.label}
                              </span>
                            )
                          })}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      className={earnedArtworkItems.length > 0
                        ? styles.badgeRow
                        : `${styles.badgeRow} ${styles.badgeRowCompact}`}
                    >
                    {row.items.map((item) => {
                      const isEarned = earnedCodes.has(item.badge_code)
                      const presentation = getMemberBadgePresentation(item.badge_code)
                      const Icon = presentation.Icon
                      const imageSrc = resolveBadgeArtwork(item.badge_code)
                      const layeredProgressArtwork = resolveLayeredProgressArtwork(item.badge_code)
                      const earnedBadge = earnedBadges.find((badge) => badge.badge_code === item.badge_code)

                      return (
                        <span
                          key={item.badge_code}
                          className={isEarned ? styles.badgeStep : styles.badgeStepLocked}
                          data-palette={presentation.palette}
                          data-earned={isEarned ? 'true' : 'false'}
                          data-contribution-tier={earnedBadge?.current_tier ?? undefined}
                          data-role-volume={item.badge_code.startsWith('role_volume_') ? 'true' : undefined}
                        >
                          <span className={imageSrc && isEarned ? styles.badgeItemWithImage : styles.badgeItem}>
                            <span
                              className={imageSrc && isEarned
                                ? `${styles.badgeArtwork} ${layeredProgressArtwork ? styles.badgeArtworkLayered : ''}`
                                : styles.badgeIcon}
                              aria-label={isEarned ? undefined : `${item.label} gesperrt`}
                            >
                              {isEarned && layeredProgressArtwork ? (
                                <>
                                  <span className={styles.roleArtworkMist} aria-hidden="true" />
                                  <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
                                  <Image
                                    className={styles.roleArtworkMotif}
                                    src={layeredProgressArtwork.motifSrc}
                                    alt=""
                                    width={1254}
                                    height={1254}
                                    sizes="(max-width: 520px) 205px, (max-width: 900px) 240px, 280px"
                                    unoptimized
                                    aria-hidden="true"
                                  />
                                  <Image
                                    className={styles.roleArtworkFrame}
                                    src={layeredProgressArtwork.frameSrc}
                                    alt=""
                                    width={1254}
                                    height={1254}
                                    sizes="(max-width: 520px) 205px, (max-width: 900px) 240px, 280px"
                                    unoptimized
                                    aria-hidden="true"
                                    data-achievement-art={item.badge_code}
                                  />
                                </>
                              ) : isEarned && imageSrc ? (
                                <Image
                                  src={imageSrc}
                                  alt=""
                                  width={512}
                                  height={512}
                                  sizes="(max-width: 520px) 205px, (max-width: 900px) 240px, 280px"
                                  unoptimized
                                  aria-hidden="true"
                                  data-achievement-art={item.badge_code}
                                />
                              ) : isEarned ? (
                                <Icon size={24} aria-hidden="true" />
                              ) : (
                                <Lock size={20} aria-hidden="true" />
                              )}
                            </span>
                            <span className={styles.badgeText}>
                              <span>{item.label}</span>
                              {presentation.detailLabel ? (
                                <span className={styles.badgeDetail}>{presentation.detailLabel}</span>
                              ) : null}
                            </span>
                            {isEarned && earnedBadge ? <ContributionProgress badge={earnedBadge} /> : null}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                  )
                }}
              />
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
