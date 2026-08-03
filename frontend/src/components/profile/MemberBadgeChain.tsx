'use client'

import Image from 'next/image'
import { Lock } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { Badge, Card, FocalCarousel, SectionHeader } from '@/components/ui'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'
import type { PublicMemberBadge, PublicMemberBadgeProgress } from '@/types/profile'

import {
  MEMBER_BADGE_GROUP_LABELS,
  MEMBER_BADGE_GROUP_ORDER,
  PUBLIC_MEMBER_BADGE_CATALOG,
  getMemberBadgePresentation,
  resolveMemberBadgeFamilies,
  resolveRoleProgressPresentation,
  ROLE_VOLUME_TIER_THRESHOLDS,
  type MemberBadgeGroup,
  type MemberBadgeFamilyPresentation,
  type MemberBadgePresentation,
  type PublicMemberBadgeCatalogItem,
} from './memberBadgeLabels'
import styles from './MemberBadgeChain.module.css'

type MemberBadgeChainProps = {
  earnedBadges: PublicMemberBadge[]
  badgeProgress?: PublicMemberBadgeProgress[]
  catalog?: PublicMemberBadgeCatalogItem[]
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

function FamilyCollectionCard({ family }: { family: MemberBadgeFamilyPresentation }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const selectedStage = family.stages.find((stage) => stage.badge_code === selectedCode && stage.earned)
  const heroStage = selectedStage ?? family.heroStage
  const currentCode = family.currentStage?.badge_code ?? null
  const heroPresentation = getMemberBadgePresentation(heroStage.badge_code)
  const HeroIcon = heroPresentation.Icon
  const heroArtwork = resolveBadgeArtwork(heroStage.badge_code)
  const layeredArtwork = resolveLayeredProgressArtwork(heroStage.badge_code)
  const unit = family.currentCount === 1 ? family.unitSingular : family.unitPlural
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(family.currentCount ?? 0, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const nextLabel = family.group === 'contributions'
    ? family.nextStage ? getMemberBadgePresentation(family.nextStage.badge_code).label.split(' · ').at(-1) : family.nextThreshold
    : family.key === 'progress'
      ? `${family.nextThreshold} Projekte`
      : family.key === 'points'
        ? `${family.nextThreshold} Punkte`
        : family.key === 'membership'
          ? `${family.nextThreshold} Jahre`
          : family.nextStage?.label ?? family.nextThreshold
  const progressCopy = family.complete
    ? `${family.currentCount ?? 0} ${unit} · Höchste Stufe erreicht`
    : family.group === 'contributions'
      ? `${family.currentCount ?? 0} ${unit} · Noch ${family.remainingCount ?? 0} bis ${nextLabel}`
      : `${family.currentCount ?? 0} von ${family.nextThreshold ?? 0} ${family.key === 'progress' ? 'Anime-Projekten' : unit} · Noch ${family.remainingCount ?? 0} bis ${nextLabel}`

  useEffect(() => {
    const current = stripRef.current?.querySelector<HTMLElement>('[data-current="true"]')
    if (!current || typeof current.scrollIntoView !== 'function') return
    const reduced = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [family.key, family.currentCount, currentCode])

  const chooseStage = (badgeCode: string) => setSelectedCode(badgeCode === currentCode ? null : badgeCode)
  const handleStageKey = (event: KeyboardEvent<HTMLButtonElement>, badgeCode: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    chooseStage(badgeCode)
  }

  return (
    <Card className={styles.familyCard} data-family={family.key}>
      <span className={styles.familyEyebrow}>{family.label}</span>
      <span className={`${styles.familyHero} ${!heroStage.earned ? styles.familyHeroLocked : ''}`}>
        {layeredArtwork ? (
          <>
            <span className={styles.roleArtworkMist} aria-hidden="true" />
            <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
            <Image className={styles.roleArtworkMotif} src={layeredArtwork.motifSrc} alt="" width={1254} height={1254} unoptimized aria-hidden="true" />
            <Image className={styles.roleArtworkFrame} src={layeredArtwork.frameSrc} alt={heroStage.label} width={1254} height={1254} unoptimized data-achievement-art={heroStage.badge_code} />
          </>
        ) : heroArtwork ? (
          <Image src={heroArtwork} alt={heroStage.label} width={512} height={512} unoptimized data-achievement-art={heroStage.badge_code} />
        ) : (
          <HeroIcon size={96} aria-label={heroStage.label} />
        )}
        {!heroStage.earned ? <Lock size={24} aria-hidden="true" /> : null}
      </span>
      <div className={styles.familyStatus}>
        <Badge variant={heroPresentation.variant}>{heroStage.label}</Badge>
        {selectedStage ? <Badge variant="info">Ausgewählt</Badge> : null}
      </div>
      {heroStage.stageKind !== 'special' ? (
        <div className={styles.familyProgressBlock}>
          <div
            role="progressbar"
            aria-label={`Fortschritt für ${family.label}`}
            aria-valuemin={0}
            aria-valuenow={progressValue}
            aria-valuemax={progressMax}
            className={styles.familyProgressTrack}
          >
            <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
          </div>
          <p className={styles.familyProgressCopy}>{progressCopy}</p>
        </div>
      ) : null}
      {heroStage.stageKind !== 'special' ? (
        <div ref={stripRef} className={styles.familyStages} role="list" aria-label={`Stufen für ${family.label}`} data-badge-stage-strip>
          {family.stages.map((stage) => {
            const current = stage.badge_code === currentCode
            const selected = stage.badge_code === selectedCode
            const presentation = getMemberBadgePresentation(stage.badge_code)
            const StageIcon = presentation.Icon
            const artwork = resolveBadgeArtwork(stage.badge_code)
            const label = family.key === 'progress' && stage.badge_code !== 'first_contribution'
              ? `${stage.threshold} Anime-Projekte`
              : presentation.label.split(' · ').at(-1) ?? presentation.label
            return stage.earned ? (
              <button
                key={stage.badge_code}
                type="button"
                className={styles.familyStageButton}
                aria-label={`${label} auswählen${current ? ', Aktuell' : ''}${selected ? ', Ausgewählt' : ''}`}
                aria-pressed={selected}
                data-current={current ? 'true' : undefined}
                onClick={() => chooseStage(stage.badge_code)}
                onKeyDown={(event) => handleStageKey(event, stage.badge_code)}
              >
                <span className={styles.familyStageArtwork}>
                  {artwork ? <Image src={artwork} alt="" width={72} height={72} unoptimized aria-hidden="true" /> : <StageIcon size={24} aria-hidden="true" />}
                </span>
                <span>{label}</span>
                {current ? <span className={styles.currentChip}>Aktuell</span> : null}
              </button>
            ) : (
              <span key={stage.badge_code} role="listitem" className={styles.familyStageLocked} aria-label={`${label} · Gesperrt`}>
                <span className={styles.familyStageArtwork}><Lock size={16} aria-hidden="true" /></span>
                <span>{label}</span>
                <span className={styles.visuallyHidden}>Gesperrt</span>
              </span>
            )
          })}
        </div>
      ) : null}
    </Card>
  )
}

export function MemberBadgeChain({
  earnedBadges,
  badgeProgress,
  catalog = PUBLIC_MEMBER_BADGE_CATALOG,
}: MemberBadgeChainProps) {
  const earnedCodes = new Set(earnedBadges.map((badge) => badge.badge_code))
  const roleCounts = new Map<string, number>()
  for (const badge of earnedBadges) {
    const presentation = getMemberBadgePresentation(badge.badge_code)
    if (presentation.group !== 'roles' || !presentation.roleCode) continue
    const knownRole = FANSUB_GROUP_ROLE_OPTIONS.some((option) => option.code === presentation.roleCode)
    if (!knownRole && !['admin', 'other'].includes(presentation.roleCode)) continue
    const tier = (['bronze', 'silver', 'gold', 'platinum'] as const)
      .find((candidate) => badge.badge_code.endsWith(`_${candidate}`))
    const fallbackCount = badge.badge_code.startsWith('role_entry_')
      ? 1
      : tier ? ROLE_VOLUME_TIER_THRESHOLDS[tier] : 0
    const count = badge.current_count ?? fallbackCount
    if (count < 1) continue
    roleCounts.set(presentation.roleCode, Math.max(roleCounts.get(presentation.roleCode) ?? 0, count))
  }
  const orderedRoleCodes = [...FANSUB_GROUP_ROLE_OPTIONS.map((option) => option.code), 'admin', 'other']
    .filter((roleCode) => roleCounts.has(roleCode))
  const earnedRoleCodes = new Set(orderedRoleCodes)
  const mergedCatalog = catalogWithEarnedBadges(catalog, earnedBadges)
  const generalCatalog = mergedCatalog.filter(
    (item) => getMemberBadgePresentation(item.badge_code).group !== 'roles',
  )
  const roleCatalog = orderedRoleCodes.flatMap((roleCode) => {
    const entryCode = `role_entry_${roleCode}`
    return [
      { badge_code: entryCode, badge_category: 'role_entry', label: getMemberBadgePresentation(entryCode).label },
      ...(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
        const badgeCode = `role_volume_${roleCode}_${tier}`
        return { badge_code: badgeCode, badge_category: 'role_volume', label: getMemberBadgePresentation(badgeCode).label }
      }),
    ]
  })
  const earnedCount = generalCatalog.filter((item) => earnedCodes.has(item.badge_code)).length
  const progressPercent = generalCatalog.length > 0
    ? Math.round((earnedCount / generalCatalog.length) * 100)
    : 0
  const collectionEnabled = badgeProgress !== undefined
  const groups = buildMemberBadgeGroups([...generalCatalog, ...roleCatalog])
    .filter((group) => !collectionEnabled || group.key === 'roles')
  const families = resolveMemberBadgeFamilies({
    earned_codes: [...earnedCodes],
    badge_progress: badgeProgress ?? [],
  })
  const collectionGroups = (collectionEnabled ? MEMBER_BADGE_GROUP_ORDER : [])
    .filter((group): group is Exclude<MemberBadgeGroup, 'roles'> => group !== 'roles')
    .map((group) => ({
      key: group,
      label: MEMBER_BADGE_GROUP_LABELS[group],
      families: families.filter((family) => family.group === group),
    }))
    .filter((group) => group.families.length > 0)

  return (
    <section className={styles.section}>
      <SectionHeader title="Auszeichnungen" />

      <Card variant="section" className={styles.chainCard}>
        <div className={styles.progressBlock} aria-label={`${earnedCount} von ${generalCatalog.length} allgemeine Auszeichnungen`}>
          <div className={styles.progressMeta}>
            <span>Allgemeine Auszeichnungen</span>
            <span>{earnedCount} von {generalCatalog.length}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className={styles.groupList}>
          {groups.map((group) => (
            <div key={group.key} className={styles.group} data-badge-group={group.key}>
              <h3 className={styles.groupTitle}>{group.key === 'roles' ? 'Rollenfortschritt' : group.label}</h3>
              {group.key === 'roles' ? (
                <div className={styles.progressMeta}>
                  <span>
                    {earnedRoleCodes.size} {earnedRoleCodes.size === 1
                      ? 'ausgeübte Fansubrolle'
                      : 'ausgeübte Fansubrollen'}
                  </span>
                </div>
              ) : null}
              <FocalCarousel
                items={group.rows}
                getItemKey={(row) => row.key}
                regionLabel={group.key === 'roles' ? 'Rollenfortschritt-Karussell' : `${group.label}-Karussell`}
                itemSingularLabel={group.key === 'roles' ? 'Rolle' : 'Auszeichnung'}
                itemPluralLabel={group.key === 'roles' ? 'Rollen' : 'Auszeichnungen'}
                listLabel={group.label}
                previousLabel={group.key === 'roles' ? 'Vorherige Rolle' : `Vorherige Auszeichnung in ${group.label}`}
                nextLabel={group.key === 'roles' ? 'Nächste Rolle' : `Nächste Auszeichnung in ${group.label}`}
                showCounter={group.key === 'roles'}
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
                    const count = roleCounts.get(row.key) ?? 0
                    const progress = resolveRoleProgressPresentation(count)
                    const roleLabel = resolveRoleLabel(row.key)
                    const currentIndex = ['entry', 'bronze', 'silver', 'gold', 'platinum'].indexOf(progress.tier ?? '')
                    const artworkItem = row.items[currentIndex]
                    const artworkSrc = artworkItem ? resolveBadgeArtwork(artworkItem.badge_code) : undefined
                    const layeredRoleArtwork = artworkItem ? resolveLayeredRoleArtwork(artworkItem.badge_code) : undefined
                    const heroAlt = `${progress.rankLabel.split(' · ')[0]}medaille für ${roleLabel}`

                    return (
                      <Card className={styles.roleBadgeRow} data-role-code={row.key}>
                        <span className={styles.roleLabel}>{roleLabel}:</span>
                        {artworkItem && artworkSrc ? (
                          <span className={`${styles.roleHeroArtwork} ${layeredRoleArtwork ? styles.roleHeroArtworkLayered : ''}`}>
                            {layeredRoleArtwork ? (
                              <>
                                <span className={styles.roleArtworkMist} aria-hidden="true" />
                                <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
                                <Image className={styles.roleArtworkMotif} src={layeredRoleArtwork.motifSrc} alt="" width={1254} height={1254} sizes="(max-width: 520px) 248px, (max-width: 1099px) 280px, 320px" unoptimized aria-hidden="true" />
                                <Image className={styles.roleArtworkFrame} src={layeredRoleArtwork.frameSrc} alt={heroAlt} width={1254} height={1254} sizes="(max-width: 520px) 248px, (max-width: 1099px) 280px, 320px" unoptimized data-achievement-art={artworkItem.badge_code} />
                              </>
                            ) : (
                              <Image src={artworkSrc} alt={heroAlt} width={512} height={512} sizes="(max-width: 520px) 248px, (max-width: 1099px) 280px, 320px" unoptimized data-achievement-art={artworkItem.badge_code} />
                            )}
                          </span>
                        ) : null}
                        <Badge variant={getMemberBadgePresentation(artworkItem?.badge_code ?? '').variant}>{progress.rankLabel}</Badge>
                        <div className={styles.roleProgressBlock}>
                          <div role="progressbar" aria-label={`Fortschritt für ${roleLabel}`} aria-valuemin={0} aria-valuenow={progress.progressValue} aria-valuemax={progress.progressMax} className={styles.roleProgressTrack}>
                            <span style={{ width: `${progress.progressPercent}%` }} />
                          </div>
                          <p className={styles.roleProgressCopy}>{progress.progressCopy}</p>
                        </div>
                        <span className={styles.roleProgression} role="list" aria-label={`Medaillen für ${roleLabel}`}>
                          {row.items.map((item, index) => {
                            const reached = index <= currentIndex
                            const current = index === currentIndex
                            const stageArtwork = resolveLayeredRoleArtwork(item.badge_code)?.frameSrc ?? resolveBadgeArtwork(item.badge_code)
                            const stageName = index === 0 ? 'Einstieg' : getMemberBadgePresentation(item.badge_code).label.split(' · ')[0]
                            return (
                              <span key={item.badge_code} role="listitem" className={reached ? styles.roleStageEarned : styles.roleStageLocked} data-role-stage={stageName.toLowerCase()} data-earned={reached ? 'true' : 'false'} data-palette={getMemberBadgePresentation(item.badge_code).palette} data-role-volume={item.badge_code.startsWith('role_volume_') ? 'true' : undefined} aria-label={!reached ? `${item.label} gesperrt` : stageName}>
                                <span className={styles.roleStageArtwork}>
                                  {stageArtwork ? <Image src={stageArtwork} alt="" width={96} height={96} unoptimized aria-hidden="true" /> : null}
                                  {!reached ? <Lock size={14} aria-hidden="true" /> : null}
                                  {current ? <span className={styles.currentChip}>Aktuell</span> : null}
                                </span>
                                <span>{stageName}</span>
                                {index === 0 ? <span className={styles.visuallyHidden}>{item.label}</span> : null}
                                {!reached ? <span className={styles.visuallyHidden}>Gesperrt</span> : null}
                              </span>
                            )
                          })}
                        </span>
                      </Card>
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
          {collectionGroups.map((group) => (
            <div key={group.key} className={styles.group} data-badge-group={group.key}>
              <h3 className={styles.groupTitle}>{group.label}</h3>
              <FocalCarousel
                items={group.families}
                getItemKey={(family) => `${family.key}:${family.heroStage.badge_code}`}
                regionLabel={`${group.label}-Karussell`}
                itemSingularLabel="Sammlung"
                itemPluralLabel="Sammlungen"
                listLabel={group.label}
                previousLabel="Vorherige Sammlung"
                nextLabel="Nächste Sammlung"
                showCounter={group.families.length > 1}
                formatCounter={(position, total) => `${position} von ${total} Sammlungen`}
                carouselClassName={styles.chain}
                itemClassName={styles.badgeWindow}
                activeItemClassName={styles.badgeWindowActive}
                renderItem={(family) => <FamilyCollectionCard key={`${family.key}:${family.currentCount}:${family.currentStage?.badge_code ?? ''}`} family={family} />}
              />
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
