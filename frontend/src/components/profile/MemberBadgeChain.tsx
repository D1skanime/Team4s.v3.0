'use client'

import { Lock } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { Badge, Card, FocalCarousel, SectionHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
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
import { resolveBadgeArtwork } from './badgeArtwork'
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
  if (roleCode === 'admin') return 'Administration'
  if (roleCode === 'typesetter') return 'Typesetting'
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === roleCode)?.label ?? roleCode
}

const CONTRIBUTION_TIER_LABELS = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold' } as const
const COMPACT_BADGE_SIZES = '(max-width: 520px) 72px, 96px'
const ACTIVE_BADGE_SIZES = '(max-width: 520px) 248px, (max-width: 1099px) 280px, 320px'

function LockedStageArtwork({ className, hero = false }: { className?: string; hero?: boolean }) {
  const artworkClassName = [className, styles.lockedStageArtwork, hero ? styles.lockedStageArtworkHero : null].filter(Boolean).join(" ")
  if (hero) return (
    <span className={artworkClassName} data-locked-stage-art data-locked-stage-hero>
      <span className={styles.lockedStageHeroMedal} aria-hidden="true"><span className={styles.lockedStageHeroQuestion}>?</span><Lock className={styles.lockedStageHeroLock} /></span>
      <span className={styles.lockedStageHeroCopy}>Noch nicht freigeschaltet</span>
    </span>
  )
  return <span className={artworkClassName} data-locked-stage-art aria-hidden="true"><span>?</span><Lock size={16} /></span>
}

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
  const match = /^role_volume_(translator|encoder|typesetter|quality_checker|project_lead|editor|raw_provider|designer|admin|other)_(bronze|silver|gold|platinum)$/.exec(badgeCode)
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
  const stripSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    const strip = stripRef.current
    if (!strip) return
    const targetCode = selectedCode ?? currentCode
    const target = targetCode
      ? strip.querySelector<HTMLElement>(`[data-stage-code="${targetCode}"]`)
      : null
    if (!target) return

    const centerTarget = () => {
      if (strip.clientWidth > 0 && strip.scrollWidth <= strip.clientWidth + 1) return
      const stripRect = strip.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const desiredLeft = strip.scrollLeft
        + targetRect.left + targetRect.width / 2
        - stripRect.left - stripRect.width / 2
      const left = Math.max(0, Math.min(desiredLeft, strip.scrollWidth - strip.clientWidth))
      const reduced = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (typeof strip.scrollTo === 'function') {
        strip.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' })
      } else {
        strip.scrollLeft = left
      }
    }

    centerTarget()
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(centerTarget)
      : null
    resizeObserver?.observe(strip)
    const mobile = typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 820px)')
      : null
    mobile?.addEventListener('change', centerTarget)

    return () => {
      resizeObserver?.disconnect()
      mobile?.removeEventListener('change', centerTarget)
    }
  }, [family.key, family.currentCount, currentCode, selectedCode])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip || typeof window.matchMedia !== 'function') return
    const mobile = window.matchMedia('(max-width: 820px)')
    const settleSelection = () => {
      stripSettleTimerRef.current = null
      if (!mobile.matches) return
      const stripRect = strip.getBoundingClientRect()
      const center = stripRect.left + stripRect.width / 2
      const earnedStages = Array.from(strip.querySelectorAll<HTMLElement>('[data-stage-code]'))
      let nearest: HTMLElement | null = null
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const stage of earnedStages) {
        const stageRect = stage.getBoundingClientRect()
        const distance = Math.abs(stageRect.left + stageRect.width / 2 - center)
        if (distance < nearestDistance) {
          nearest = stage
          nearestDistance = distance
        }
      }
      const badgeCode = nearest?.dataset.stageCode
      if (badgeCode) setSelectedCode(badgeCode === currentCode ? null : badgeCode)
    }
    const handleScroll = () => {
      if (!mobile.matches) return
      if (stripSettleTimerRef.current) clearTimeout(stripSettleTimerRef.current)
      stripSettleTimerRef.current = setTimeout(settleSelection, 140)
    }
    strip.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      strip.removeEventListener('scroll', handleScroll)
      if (stripSettleTimerRef.current) clearTimeout(stripSettleTimerRef.current)
      stripSettleTimerRef.current = null
    }
  }, [currentCode, family.key])

  const chooseStage = (badgeCode: string) => {
    setSelectedCode(badgeCode === currentCode ? null : badgeCode)
  }
  const handleStageKey = (event: KeyboardEvent<HTMLButtonElement>, badgeCode: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    chooseStage(badgeCode)
  }
  const handleStageWheel = (event: WheelEvent) => {
    const strip = event.currentTarget as HTMLDivElement | null
    if (!strip) return
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta === 0) return
    const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth)
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, strip.scrollLeft + delta))
    if (nextScrollLeft === strip.scrollLeft) return
    event.preventDefault()
    strip.scrollLeft = nextScrollLeft

  }
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    strip.addEventListener('wheel', handleStageWheel, { passive: false })
    return () => {
      strip.removeEventListener('wheel', handleStageWheel)
    }
  }, [family.key])

  if (family.group === 'special') {
    return (
      <Card className={styles.specialAwardCard} data-family={family.key} data-special-award>
        <h3 className={styles.familyEyebrow}>{family.label}</h3>
        <span className={styles.specialAwardArtwork}>
          {heroArtwork ? (
            <ResponsiveImage src={heroArtwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
          ) : (
            <HeroIcon size={88} aria-label={heroStage.label} />
          )}
        </span>
        <Badge variant={heroPresentation.variant}>{heroStage.label}</Badge>
      </Card>
    )
  }

  return (
    <Card className={styles.familyCard} data-family={family.key}>
      <h3 className={styles.familyEyebrow}>{family.label}</h3>
      <span className={`${styles.familyHero} ${layeredArtwork ? styles.badgeArtworkLayered : ''} ${!heroStage.earned ? styles.familyHeroLocked : ''}`}>
        {layeredArtwork ? (
          <>
            <span className={styles.roleArtworkMist} aria-hidden="true" />
            <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
            <ResponsiveImage className={styles.roleArtworkMotif} src={layeredArtwork.motifSrc} alt="" width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} aria-hidden="true" />
            <ResponsiveImage className={styles.roleArtworkFrame} src={layeredArtwork.frameSrc} alt={heroStage.label} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
          </>
        ) : heroArtwork ? (
          <ResponsiveImage src={heroArtwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
        ) : (
          <HeroIcon size={96} aria-label={heroStage.label} />
        )}
        {!heroStage.earned ? <Lock size={24} aria-hidden="true" /> : null}
      </span>
      <div className={styles.familyStatus}>
        <Badge variant={heroPresentation.variant}>{heroStage.label}</Badge>
        {selectedStage ? <Badge variant="info">Vorschau</Badge> : null}
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
            const active = selected || (!selectedCode && current)
            const presentation = getMemberBadgePresentation(stage.badge_code)
            const StageIcon = presentation.Icon
            const artwork = resolveBadgeArtwork(stage.badge_code)
            const layeredStageArtwork = resolveLayeredProgressArtwork(stage.badge_code)
            const label = family.key === 'progress' && stage.badge_code !== 'first_contribution'
              ? `${stage.threshold} Anime-Projekte`
              : presentation.label.split(' · ').at(-1) ?? presentation.label
            return (
              <span key={stage.badge_code} role="listitem" className={styles.familyStageItem}>
                {stage.earned ? (
                  <button
                    type="button"
                    className={`${styles.familyStageButton} ${active ? styles.familyStageButtonActive : ''}`}
                    aria-label={`${label} auswählen${current ? ', Aktuell' : ''}`}
                    aria-pressed={selected}
                    data-current={current ? 'true' : undefined}
                    data-stage-code={stage.badge_code}
                    data-active={active ? 'true' : undefined}
                    onClick={() => chooseStage(stage.badge_code)}
                    onKeyDown={(event) => handleStageKey(event, stage.badge_code)}
                  >
                    <span className={`${styles.familyStageArtwork} ${layeredStageArtwork ? styles.badgeArtworkLayered : ''}`}>
                      {layeredStageArtwork ? (
                        <>
                          <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
                          <ResponsiveImage className={styles.roleArtworkMotif} src={layeredStageArtwork.motifSrc} alt="" width={72} height={72} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" />
                          <ResponsiveImage className={styles.roleArtworkFrame} src={layeredStageArtwork.frameSrc} alt="" width={72} height={72} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" />
                        </>
                      ) : artwork ? <ResponsiveImage src={artwork} alt="" width={72} height={72} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" /> : <StageIcon size={24} aria-hidden="true" />}
                    </span>
                    <span>{label}</span>
                    {current ? <span className={styles.currentChip}>Aktuell</span> : null}
                  </button>
                ) : (
                  <span className={styles.familyStageLocked} aria-label={`${label} · Gesperrt`}>
                    <LockedStageArtwork className={styles.familyStageArtwork} />
                    <span>{label}</span>
                    <span className={styles.visuallyHidden}>Gesperrt</span>
                  </span>
                )}
              </span>
            )
          })}
        </div>
      ) : null}
    </Card>
  )
}

function AnimeProjectAchievementStage({ family }: { family: MemberBadgeFamilyPresentation }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const currentCode = family.currentStage?.badge_code ?? null
  const selectedStage = family.stages.find((stage) => stage.badge_code === selectedCode && stage.earned)
  const heroStage = selectedStage ?? family.heroStage
  const presentation = getMemberBadgePresentation(heroStage.badge_code)
  const HeroIcon = presentation.Icon
  const artwork = resolveBadgeArtwork(heroStage.badge_code)
  const layeredArtwork = resolveLayeredProgressArtwork(heroStage.badge_code)
  const count = family.currentCount ?? 0
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(count, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const unit = count === 1 ? family.unitSingular : family.unitPlural
  const rank = presentation.label.split(' · ').at(-1) ?? presentation.label
  const nextRank = family.nextStage
    ? (getMemberBadgePresentation(family.nextStage.badge_code).label.split(' · ').at(-1) ?? family.nextStage.label)
    : null

  return (
    <Card className={styles.animeProjectStage} data-family={family.key} data-anime-project-stage>
      <h3 className={styles.animeProjectTitle}>Anime-Projekte</h3>
      <div className={styles.animeProjectHero}>
        <span className={`${styles.animeProjectArtwork} ${layeredArtwork ? styles.badgeArtworkLayered : ''}`} data-anime-project-art={heroStage.badge_code}>
          {layeredArtwork ? (
            <>
              <span className={styles.roleArtworkMist} aria-hidden="true" />
              <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
              <ResponsiveImage className={styles.roleArtworkMotif} src={layeredArtwork.motifSrc} alt="" width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} aria-hidden="true" />
              <ResponsiveImage className={styles.roleArtworkFrame} src={layeredArtwork.frameSrc} alt={heroStage.label} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
            </>
          ) : artwork ? (
            <ResponsiveImage src={artwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
          ) : (
            <HeroIcon size={96} aria-label={heroStage.label} />
          )}
        </span>
        <div className={styles.animeProjectInfo} aria-live="polite">
          <div className={styles.animeProjectStatus}>
            <Badge variant={presentation.variant}>{rank}</Badge>
            {selectedStage ? <Badge variant="info">Vorschau</Badge> : null}
          </div>
          <strong className={styles.animeProjectCount}>{count} {unit}</strong>
          <div className={styles.animeProjectProgressValue}><span>{progressValue} / {progressMax}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label="Fortschritt für Anime-Projekte" aria-valuemin={0} aria-valuenow={count} aria-valuemax={progressMax} className={styles.animeProjectProgressTrack}>
            <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
          </div>
          <p className={styles.animeProjectNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${family.remainingCount ?? 0} Anime-Projekte bis ${nextRank}`}</p>
          {selectedStage ? <p className={styles.visuallyHidden}>Vorschau der bereits erreichten Stufe {rank}. Der Fortschritt zeigt weiterhin den aktuellen Stand.</p> : null}
        </div>
      </div>
      <ol className={styles.animeProjectMilestones} aria-label="Stufen für Anime-Projekte">
        {family.stages.map((stage) => {
          const current = stage.badge_code === currentCode
          const selected = stage.badge_code === selectedCode
          const stagePresentation = getMemberBadgePresentation(stage.badge_code)
          const label = stage.badge_code === 'first_contribution' ? 'Erste Mitwirkung' : (stagePresentation.label.split(' · ').at(-1) ?? stagePresentation.label)
          const content = <>{stage.earned ? <span className={styles.animeProjectMarker} aria-hidden="true">{current ? '★' : '●'}</span> : <LockedStageArtwork className={styles.animeProjectMarker} />}<span className={styles.animeProjectMilestoneName}>{label}</span><span className={styles.animeProjectThreshold}>{stage.threshold}</span>{current ? <span className={styles.currentChip}>Aktuell</span> : null}{!stage.earned ? <span className={styles.visuallyHidden}>Gesperrt</span> : null}</>
          return (
            <li key={stage.badge_code} data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'} aria-current={current ? 'step' : undefined}>
              {stage.earned ? <button type="button" aria-label={`${stage.badge_code === 'first_contribution' ? label : `${stage.threshold} Anime-Projekte`} auswählen${current ? ', Aktuell' : ''}`} aria-pressed={selected} onClick={() => setSelectedCode(current ? null : stage.badge_code)}>{content}</button> : <span aria-label={`${stage.threshold} Anime-Projekte · Gesperrt`}>{content}</span>}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

const POINT_NUMBER_FORMATTER = new Intl.NumberFormat('de-CH')

function ContributionAchievementStage({ family }: { family: MemberBadgeFamilyPresentation }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const currentCode = family.currentStage?.badge_code ?? null
  const selectedStage = family.stages.find((stage) => stage.badge_code === selectedCode && stage.earned)
  const heroStage = selectedStage ?? family.heroStage
  const presentation = getMemberBadgePresentation(heroStage.badge_code)
  const HeroIcon = presentation.Icon
  const artwork = resolveBadgeArtwork(heroStage.badge_code)
  const count = family.currentCount ?? 0
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(count, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const unit = count === 1 ? family.unitSingular : family.unitPlural
  const tierLabel = (code: string) => CONTRIBUTION_TIER_LABELS[code.split('_').at(-1) as keyof typeof CONTRIBUTION_TIER_LABELS]
  const nextTier = family.nextStage ? tierLabel(family.nextStage.badge_code) : null
  return (
    <Card className={styles.contributionAchievementStage} data-family={family.key} data-contribution-achievement-stage>
      <h3 className={styles.contributionStageTitle}>{family.label}</h3>
      <div className={styles.contributionStageHero}>
        <span className={styles.contributionHeroArtwork} data-contribution-art={heroStage.badge_code}>
          {currentCode ? (artwork ? <ResponsiveImage src={artwork} alt={heroStage.label} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} /> : <HeroIcon size={96} aria-label={heroStage.label} />) : <LockedStageArtwork hero />}
        </span>
        <div className={styles.contributionStageInfo} aria-live="polite">
          <div className={styles.contributionStageStatus}><Badge variant={currentCode ? presentation.variant : 'muted'}>{tierLabel(heroStage.badge_code)}</Badge><Badge variant={selectedStage ? 'info' : currentCode ? 'success' : 'muted'}>{selectedStage ? 'Vorschau' : currentCode ? 'Aktuell' : 'Gesperrt'}</Badge></div>
          <strong className={styles.contributionStageCount}>{count} {unit}</strong>
          <div className={styles.contributionStageProgressValue}><span>{progressValue} / {progressMax}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label={`Fortschritt für ${family.label}`} aria-valuemin={0} aria-valuenow={progressValue} aria-valuemax={progressMax} className={styles.contributionStageProgressTrack}><span style={{ width: `${family.complete ? 100 : progressPercent}%` }} /></div>
          <p className={styles.contributionStageNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${family.remainingCount ?? 0} ${family.remainingCount === 1 ? family.unitSingular : family.unitPlural} bis ${nextTier}`}</p>
          {selectedStage ? <p className={styles.visuallyHidden}>Vorschau der bereits erreichten Stufe {tierLabel(heroStage.badge_code)}. Der Fortschritt zeigt weiterhin den aktuellen Stand.</p> : null}
        </div>
      </div>
      <ol className={styles.contributionTierTrack} aria-label={`Stufen für ${family.label}`}>
        {family.stages.map((stage) => {
          const current = stage.badge_code === currentCode
          const selected = (selectedCode ?? currentCode) === stage.badge_code
          const stagePresentation = getMemberBadgePresentation(stage.badge_code)
          const stageArtwork = stage.earned ? resolveBadgeArtwork(stage.badge_code) : undefined
          const StageIcon = stagePresentation.Icon
          const tier = tierLabel(stage.badge_code)
          const state = current ? 'Aktuell' : stage.earned ? '' : 'Gesperrt'
          const content = <>{stage.earned ? <span className={styles.contributionTierArtwork}>{stageArtwork ? <ResponsiveImage src={stageArtwork} alt="" width={160} height={160} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" data-achievement-art={stage.badge_code} /> : <StageIcon size={32} aria-hidden="true" />}</span> : <LockedStageArtwork className={styles.contributionTierArtwork} />}<span className={styles.contributionTierName}>{tier}</span><span className={styles.contributionTierState}>{state === 'Gesperrt' ? <Lock size={12} aria-hidden="true" /> : null}{state}</span></>
          return <li key={stage.badge_code} data-badge-code={stage.badge_code} data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'} aria-current={current ? 'step' : undefined}>{stage.earned ? <button type="button" aria-label={`${tier} auswählen${current ? ', Aktuell' : ''}`} aria-pressed={selected} onClick={() => setSelectedCode(current ? null : stage.badge_code)}>{content}</button> : <span aria-label={`${tier} · Gesperrt`}>{content}</span>}</li>
        })}
      </ol>
    </Card>
  )
}

function MembershipStage({ family }: { family: MemberBadgeFamilyPresentation }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const currentCode = family.currentStage?.badge_code ?? null
  const foundingPreview = selectedCode === family.foundingStage?.badge_code
  const selectedStage = family.stages.find((stage) => stage.badge_code === selectedCode && stage.earned && stage.badge_code !== currentCode)
  const heroStage = foundingPreview ? family.foundingStage! : selectedStage ?? family.heroStage
  const presentation = getMemberBadgePresentation(heroStage.badge_code)
  const HeroIcon = presentation.Icon
  const artwork = resolveBadgeArtwork(heroStage.badge_code)
  const count = family.currentCount ?? 0
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(count, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const nextLabel = family.nextStage ? `${family.nextStage.threshold} Jahre` : null

  return (
    <Card className={styles.membershipStage} data-family={family.key} data-membership-stage>
      <h3 className={styles.membershipStageTitle}>Mitgliedschaft</h3>
      <div className={styles.membershipStageHero}>
        <span className={styles.membershipHeroArtwork} data-membership-art={heroStage.badge_code}>
          {currentCode || foundingPreview ? (artwork ? <ResponsiveImage src={artwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} /> : <HeroIcon size={96} aria-label={heroStage.label} />) : <LockedStageArtwork hero />}
        </span>
        <div className={styles.membershipStageInfo} aria-live="polite">
          <h4 className={styles.membershipHeroTitle}>{foundingPreview ? 'Besondere Mitgliedschaft' : 'Mitgliedsdauer'}</h4>
          <div className={styles.membershipStageStatus}><Badge variant={currentCode || foundingPreview ? presentation.variant : 'muted'}>{foundingPreview ? 'Gründungsmitglied' : presentation.label}</Badge><Badge variant={foundingPreview || selectedStage ? 'info' : currentCode ? 'success' : 'muted'}>{foundingPreview || selectedStage ? 'Vorschau' : currentCode ? 'Aktuell' : 'Gesperrt'}</Badge></div>
          {foundingPreview ? <p className={styles.membershipHeroDescription}>Seit der Gründung dabei</p> : null}
          <strong className={styles.membershipStageCount}>{count} {count === 1 ? family.unitSingular : family.unitPlural}</strong>
          <div className={styles.membershipProgressValue}><span>{progressValue} / {progressMax}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label="Fortschritt für Mitgliedschaft" aria-valuemin={0} aria-valuenow={progressValue} aria-valuemax={progressMax} className={styles.membershipProgressTrack}><span style={{ width: `${family.complete ? 100 : progressPercent}%` }} /></div>
          <p className={styles.membershipStageNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${family.remainingCount ?? 0} ${family.remainingCount === 1 ? 'Jahr' : 'Jahre'} bis ${nextLabel}`}</p>
          {foundingPreview || selectedStage ? <p className={styles.visuallyHidden}>Vorschau einer bereits erreichten Mitgliedschaftsauszeichnung. Der Fortschritt zeigt weiterhin den aktuellen Stand.</p> : null}
        </div>
      </div>
      <ol className={styles.membershipDurationTrack} aria-label="Dauerstufen der Mitgliedschaft" data-membership-duration-track>
        {family.stages.map((stage) => {
          const current = stage.badge_code === currentCode
          const selected = stage.badge_code === selectedCode || (selectedCode === null && current)
          const stageArtwork = stage.earned ? resolveBadgeArtwork(stage.badge_code) : undefined
          const StageIcon = getMemberBadgePresentation(stage.badge_code).Icon
          const label = `${stage.threshold} Jahre Mitgliedschaft`
          const content = <>{stage.earned ? <span className={styles.membershipStageArtwork}>{stageArtwork ? <ResponsiveImage src={stageArtwork} alt="" width={160} height={160} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" data-achievement-art={stage.badge_code} /> : <StageIcon size={32} aria-hidden="true" />}</span> : <LockedStageArtwork className={styles.membershipStageArtwork} />}<span className={styles.membershipStageName}>{stage.threshold} Jahre</span><span className={styles.membershipStageState}>{current ? 'Aktuell' : stage.earned ? 'Erreicht' : <><Lock size={12} aria-hidden="true" /> Gesperrt</>}</span></>
          return <li key={stage.badge_code} data-badge-code={stage.badge_code} data-threshold={stage.threshold} data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'} aria-current={current ? 'step' : undefined}>{stage.earned ? <button type="button" aria-label={`${label} auswählen${current ? ', Aktuell' : ''}`} aria-pressed={selected} onClick={() => setSelectedCode(current ? null : stage.badge_code)}>{content}</button> : <span aria-label={`${label} · Gesperrt`}>{content}</span>}</li>
        })}
      </ol>
      {family.foundingStage ? <aside className={styles.foundingMemberPanel} data-founding-member aria-label="Besondere Mitgliedschaft">
        <button type="button" className={styles.foundingMemberButton} aria-label="Gründungsmitglied Vorschau" aria-pressed={foundingPreview} onClick={() => setSelectedCode(foundingPreview ? null : family.foundingStage!.badge_code)}>
          <span className={styles.foundingMemberArtwork}>{!foundingPreview && resolveBadgeArtwork(family.foundingStage.badge_code) ? <ResponsiveImage src={resolveBadgeArtwork(family.foundingStage.badge_code)!} alt="" width={192} height={192} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" data-achievement-art={family.foundingStage.badge_code} /> : null}</span>
          <span className={styles.foundingMemberCopy}><strong>Besondere Mitgliedschaft</strong><span className={styles.foundingMemberLabel}>Gründungsmitglied</span><span className={styles.foundingMemberDescription}>Seit der Gründung dabei</span></span>
        </button>
      </aside> : null}
    </Card>
  )
}

function PointsAchievementStage({ family }: { family: MemberBadgeFamilyPresentation }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const currentCode = family.currentStage?.badge_code ?? null
  const selectedStage = family.stages.find((stage) => stage.badge_code === selectedCode && stage.earned && stage.badge_code !== currentCode)
  const heroStage = selectedStage ?? family.heroStage
  const presentation = getMemberBadgePresentation(heroStage.badge_code)
  const HeroIcon = presentation.Icon
  const artwork = resolveBadgeArtwork(heroStage.badge_code)
  const count = family.currentCount ?? 0
  const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
  const progressValue = Math.min(Math.max(count, 0), progressMax)
  const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
  const nextLabel = family.nextStage ? getMemberBadgePresentation(family.nextStage.badge_code).label : null
  const formatPoints = (value: number) => POINT_NUMBER_FORMATTER.format(value)
  return (
    <Card className={styles.pointsAchievementStage} data-family={family.key} data-points-achievement-stage>
      <h3 className={styles.pointsStageTitle}>Punkte-Meilensteine</h3>
      <div className={styles.pointsStageHero}>
        <span className={styles.pointsHeroArtwork}>{currentCode ? (artwork ? <ResponsiveImage src={artwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} /> : <HeroIcon size={96} aria-label={heroStage.label} />) : <LockedStageArtwork hero />}</span>
        <div className={styles.pointsStageInfo} aria-live="polite">
          {currentCode ? <div className={styles.pointsStageStatus}><Badge variant={presentation.variant}>{presentation.label}</Badge>{selectedStage ? <Badge variant="info">Vorschau</Badge> : null}</div> : null}
          <strong className={styles.pointsStageCount}>{formatPoints(count)} Punkte{selectedStage ? ' aktuell' : ''}</strong>
          <div className={styles.pointsProgressValue}><span>{formatPoints(progressValue)} / {formatPoints(progressMax)}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label="Fortschritt für Punkte" aria-valuemin={0} aria-valuenow={progressValue} aria-valuemax={progressMax} className={styles.pointsProgressTrack}><span style={{ width: `${family.complete ? 100 : progressPercent}%` }} /></div>
          <p className={styles.pointsStageNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${formatPoints(family.remainingCount ?? 0)} Punkte bis ${nextLabel}`}</p>
        </div>
      </div>
      <ol className={styles.pointsStageTrack} aria-label="Punkte-Meilensteine">{family.stages.map((stage) => {
        const current = stage.badge_code === currentCode
        const selected = stage.badge_code === selectedCode
        const stagePresentation = getMemberBadgePresentation(stage.badge_code)
        const stageArtwork = stage.earned ? resolveBadgeArtwork(stage.badge_code) : undefined
        const StageIcon = stagePresentation.Icon
        const content = <>{stage.earned ? <span className={styles.pointsStageArtwork}>{stageArtwork ? <ResponsiveImage src={stageArtwork} alt="" width={160} height={160} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" /> : <StageIcon size={32} aria-hidden="true" />}</span> : <LockedStageArtwork className={styles.pointsStageArtwork} />}<span className={styles.pointsStageName}>Stufe: {stagePresentation.label}</span><span className={styles.pointsStageThreshold}>Ab {formatPoints(stage.threshold)} Punkten</span><span className={styles.pointsStageState}>{current ? 'Aktuell' : stage.earned ? 'Erreicht' : <><Lock size={12} aria-hidden="true" /> Gesperrt</>}</span></>
        return <li key={stage.badge_code} data-badge-code={stage.badge_code} data-threshold={stage.threshold} data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'} aria-current={current ? 'step' : undefined}>{stage.earned && !current ? <button type="button" aria-label={`${stagePresentation.label} auswählen`} aria-pressed={selected} onClick={() => { if (stage.earned && stage.badge_code !== currentCode) setSelectedCode(stage.badge_code) }}>{content}</button> : <span aria-label={`${stagePresentation.label} · ${current ? 'Aktuell' : 'Gesperrt'}`}>{content}</span>}</li>
      })}</ol>
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
    .filter((group): group is Exclude<MemberBadgeGroup, 'roles'> => group !== 'roles' && group !== 'special')
    .map((group) => ({
      key: group,
      label: MEMBER_BADGE_GROUP_LABELS[group],
      families: families.filter((family) => family.group === group),
    }))
    .filter((group) => group.families.length > 0)

  return (
    <section className={styles.section}>
      <Card variant="section" className={styles.chainCard}>
        <div className={styles.progressBlock} aria-label={`${earnedCount} von ${generalCatalog.length} Auszeichnungen freigeschaltet`}>
          <div className={styles.progressMeta}>
            <span>Allgemeine Auszeichnungen</span>
            <span>{earnedCount} von {generalCatalog.length} Auszeichnungen freigeschaltet</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className={styles.groupList}>
          {groups.map((group) => (
            <div key={group.key} className={styles.group} data-badge-group={group.key}>
              <SectionHeader
                title={group.key === 'roles' ? 'Rollenfortschritt' : group.label}
                underline
              />
              {group.key === 'roles' ? (
                <div className={styles.progressMeta}>
                  <span>
                    {earnedRoleCodes.size} {earnedRoleCodes.size === 1
                      ? 'ausgeübte Fansubrolle'
                      : 'ausgeübte Fansubrollen'}
                  </span>
                </div>
              ) : null}
              <div className={styles.carouselShell}>
                <div className={styles.carouselSkeleton} aria-hidden="true" data-badge-skeleton>
                  <span className={styles.skeletonControl} />
                  <span className={styles.skeletonCard} />
                  <span className={styles.skeletonControl} />
                </div>
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
                deferInteractionUntilNearViewport
                renderItem={(row, state) => {
                  const earnedArtworkItems = row.items.filter(
                    (item) => earnedCodes.has(item.badge_code) && resolveBadgeArtwork(item.badge_code),
                  )

                  if (group.key === 'roles') {
                    const count = roleCounts.get(row.key) ?? 0
                    const progress = resolveRoleProgressPresentation(count)
                    const roleLabel = resolveRoleLabel(row.key)
                    const currentIndex = ['entry', 'bronze', 'silver', 'gold', 'platinum'].indexOf(progress.tier ?? '')
                    const artworkItem = row.items[Math.max(0, currentIndex)]
                    const artworkSrc = artworkItem ? resolveBadgeArtwork(artworkItem.badge_code) : undefined
                    const layeredRoleArtwork = artworkItem ? resolveLayeredRoleArtwork(artworkItem.badge_code) : undefined
                    const heroAlt = `${progress.rankLabel.split(' · ')[0]}medaille für ${roleLabel}`

                    return (
                      <Card
                        className={styles.roleBadgeRow}
                        data-role-code={row.key}
                        data-role-card-state={state.expanded ? 'expanded' : state.active ? 'active' : 'inactive'}
                        data-active={state.active ? 'true' : 'false'}
                        data-expanded={state.expanded ? 'true' : 'false'}
                      >
                        <h3 className={styles.roleLabel}>{roleLabel}:</h3>
                        {artworkItem && artworkSrc ? (
                          <span className={`${styles.roleHeroArtwork} ${layeredRoleArtwork ? styles.roleHeroArtworkLayered : ''}`}>
                            {layeredRoleArtwork ? (
                              <>
                                <span className={styles.roleArtworkMist} aria-hidden="true" />
                                <span className={styles.roleArtworkBackdrop} aria-hidden="true" />
                                <ResponsiveImage className={styles.roleArtworkMotif} src={layeredRoleArtwork.motifSrc} alt="" width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} aria-hidden="true" />
                                <ResponsiveImage className={styles.roleArtworkFrame} src={layeredRoleArtwork.frameSrc} alt={heroAlt} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={artworkItem.badge_code} />
                              </>
                            ) : (
                              <ResponsiveImage src={artworkSrc} alt={heroAlt} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={artworkItem.badge_code} />
                            )}
                          </span>
                        ) : null}
                        <div className={styles.roleStatus}>
                          <Badge variant={getMemberBadgePresentation(artworkItem?.badge_code ?? '').variant}>{progress.tierLabel}</Badge>
                          <strong className={styles.roleCount}>{count} Mitwirkungen</strong>
                        </div>
                        <div className={styles.roleProgressBlock}>
                          <div className={styles.roleProgressValue}>
                            <span>{progress.progressValue} / {progress.progressMax}</span>
                            <span>{Math.round(progress.progressPercent)}%</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`Fortschritt für ${roleLabel}`}
                            aria-valuemin={0}
                            aria-valuenow={progress.progressValue}
                            aria-valuemax={progress.progressMax}
                            className={styles.roleProgressTrack}
                          >
                            <span style={{ width: `${progress.progressPercent}%` }} />
                          </div>
                          <p className={styles.roleNextCopy}>{progress.nextCopy}</p>
                        </div>
                        <ol className={styles.roleProgression} aria-label={`Medaillen für ${roleLabel}`}>
                          {progress.stages.map((stage, index) => {
                            const current = stage.state === 'current'
                            const item = row.items[index]
                            return (
                              <li key={stage.tier} className={stage.state === 'locked' ? styles.roleStageLocked : styles.roleStageEarned} data-role-stage={stage.label.toLowerCase()} data-role-stage-state={stage.state} data-palette={item ? getMemberBadgePresentation(item.badge_code).palette : undefined} data-role-volume={item?.badge_code.startsWith('role_volume_') ? 'true' : undefined} aria-current={current ? 'step' : undefined} aria-label={stage.state === 'locked' ? `${stage.label} · ${stage.threshold}+ gesperrt` : undefined}>
                                {stage.state === 'locked' ? <LockedStageArtwork className={styles.roleStageMarker} /> : <span className={styles.roleStageMarker} aria-hidden="true"><Lock size={13} /></span>}
                                <span className={styles.roleStageName}>{stage.label}</span>
                                <span className={styles.roleStageThreshold}>{stage.threshold}+</span>
                                <span className={styles.currentChip}>{current ? 'Aktuell' : ''}</span>
                                <span className={styles.roleStageState}>{stage.state === 'locked' ? 'Gesperrt' : ''}</span>
                                <span className={styles.visuallyHidden}>{index === 0 ? item?.label ?? stage.label : ''}</span>
                              </li>
                            )
                          })}
                        </ol>
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
                                  <ResponsiveImage
                                    className={styles.roleArtworkMotif}
                                    src={layeredProgressArtwork.motifSrc}
                                    alt=""
                                    width={1254}
                                    height={1254}
                                    sizes={ACTIVE_BADGE_SIZES}
                                    aria-hidden="true"
                                  />
                                  <ResponsiveImage
                                    className={styles.roleArtworkFrame}
                                    src={layeredProgressArtwork.frameSrc}
                                    alt=""
                                    width={1254}
                                    height={1254}
                                    sizes={ACTIVE_BADGE_SIZES}
                                    aria-hidden="true"
                                    data-achievement-art={item.badge_code}
                                  />
                                </>
                              ) : isEarned && imageSrc ? (
                                <ResponsiveImage
                                  src={imageSrc}
                                  alt=""
                                  width={512}
                                  height={512}
                                  sizes={ACTIVE_BADGE_SIZES}
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
            </div>
          ))}
          {collectionGroups.map((group) => (
            <div key={group.key} className={styles.group} data-badge-group={group.key}>
              <SectionHeader title={group.label} underline />
              {group.key === 'progress' ? (
                <AnimeProjectAchievementStage key={`${group.families[0].currentCount}:${group.families[0].currentStage?.badge_code ?? ''}`} family={group.families[0]} />
              ) : group.key === 'points' ? (
                <PointsAchievementStage key={`${group.families[0].currentCount}:${group.families[0].currentStage?.badge_code ?? ''}`} family={group.families[0]} />
              ) : group.key === 'membership' ? (
                <MembershipStage key={`${group.families[0].currentCount}:${group.families[0].currentStage?.badge_code ?? ''}`} family={group.families[0]} />
              ) : <div className={styles.carouselShell}>
                {group.key === 'contributions' ? null : <div className={styles.carouselSkeleton} aria-hidden="true" data-badge-skeleton>
                  <span className={styles.skeletonControl} />
                  <span className={styles.skeletonCard} />
                  <span className={styles.skeletonControl} />
                </div>}
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
                showAllLabel={`Alle Auszeichnungen in ${group.label} anzeigen`}
                showLessLabel="Weniger anzeigen"
                formatCounter={(position, total) => `${position} von ${total} Sammlungen`}
                carouselClassName={`${styles.chain} ${group.key === 'special' ? styles.specialChain : ''}`}
                itemClassName={styles.badgeWindow}
                activeItemClassName={styles.badgeWindowActive}
                deferInteractionUntilNearViewport
                renderItem={(family) => group.key === 'contributions'
                  ? <ContributionAchievementStage key={`${family.key}:${family.currentCount}:${family.currentStage?.badge_code ?? ''}`} family={family} />
                  : <FamilyCollectionCard key={`${family.key}:${family.currentCount}:${family.currentStage?.badge_code ?? ''}`} family={family} />}
                />
              </div>}
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
