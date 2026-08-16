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
import chainStyles from './MemberBadgeChain.module.css'
import lockedStageArtworkStyles from './LockedStageArtwork.module.css'
import layeredBadgeArtworkStyles from './LayeredBadgeArtwork.module.css'

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

const CONTRIBUTION_TIER_LABELS = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', platinum: 'Platin' } as const
const COMPACT_BADGE_SIZES = '(max-width: 520px) 72px, 96px'
const ACTIVE_BADGE_SIZES = '(max-width: 520px) 248px, (max-width: 1099px) 280px, 320px'

function LockedStageArtwork({ className, hero = false }: { className?: string; hero?: boolean }) {
  const artworkClassName = [className, lockedStageArtworkStyles.lockedStageArtwork, hero ? lockedStageArtworkStyles.lockedStageArtworkHero : null].filter(Boolean).join(" ")
  if (hero) return (
    <span className={artworkClassName} data-locked-stage-art data-locked-stage-hero>
      <span className={lockedStageArtworkStyles.lockedStageHeroMedal} aria-hidden="true"><span className={lockedStageArtworkStyles.lockedStageHeroQuestion}>?</span><Lock className={lockedStageArtworkStyles.lockedStageHeroLock} /></span>
      <span className={lockedStageArtworkStyles.lockedStageHeroCopy}>Noch nicht freigeschaltet</span>
    </span>
  )
  return <span className={artworkClassName} data-locked-stage-art aria-hidden="true"><span>?</span><Lock size={16} /></span>
}

function ContributionProgress({ badge }: { badge: PublicMemberBadge }) {
  if (badge.badge_category !== 'contribution' || badge.current_count == null || !badge.current_tier) return null
  if (badge.next_threshold == null || badge.remaining_count == null || !badge.next_tier) {
    return <div className={chainStyles.contributionProgressTerminal}><span>{badge.current_count}</span><span>Höchste Stufe erreicht</span></div>
  }
  const percent = Math.max(0, Math.min(100, Math.round((badge.current_count / badge.next_threshold) * 100)))
  return <div className={chainStyles.contributionProgress}>
    <div className={chainStyles.contributionProgressCopy}><span>{badge.current_count} von {badge.next_threshold}</span><span>Noch {badge.remaining_count} bis {CONTRIBUTION_TIER_LABELS[badge.next_tier]}</span></div>
    <div role="progressbar" aria-label={`Fortschritt bis ${CONTRIBUTION_TIER_LABELS[badge.next_tier]}`} aria-valuemin={0} aria-valuenow={badge.current_count} aria-valuemax={badge.next_threshold} className={chainStyles.contributionProgressTrack}><span style={{ width: `${percent}%` }} /></div>
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
      <Card className={chainStyles.specialAwardCard} data-family={family.key} data-special-award>
        <h3 className={chainStyles.familyEyebrow}>{family.label}</h3>
        <span className={chainStyles.specialAwardArtwork}>
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
    <Card className={chainStyles.familyCard} data-family={family.key}>
      <h3 className={chainStyles.familyEyebrow}>{family.label}</h3>
      <span className={`${chainStyles.familyHero} ${layeredArtwork ? layeredBadgeArtworkStyles.badgeArtworkLayered : ''} ${!heroStage.earned ? chainStyles.familyHeroLocked : ''}`}>
        {layeredArtwork ? (
          <>
            <span className={layeredBadgeArtworkStyles.roleArtworkMist} aria-hidden="true" />
            <span className={layeredBadgeArtworkStyles.roleArtworkBackdrop} aria-hidden="true" />
            <ResponsiveImage className={layeredBadgeArtworkStyles.roleArtworkMotif} src={layeredArtwork.motifSrc} alt="" width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} aria-hidden="true" />
            <ResponsiveImage className={layeredBadgeArtworkStyles.roleArtworkFrame} src={layeredArtwork.frameSrc} alt={heroStage.label} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
          </>
        ) : heroArtwork ? (
          <ResponsiveImage src={heroArtwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
        ) : (
          <HeroIcon size={96} aria-label={heroStage.label} />
        )}
        {!heroStage.earned ? <Lock size={24} aria-hidden="true" /> : null}
      </span>
      <div className={chainStyles.familyStatus}>
        <Badge variant={heroPresentation.variant}>{heroStage.label}</Badge>
        {selectedStage ? <Badge variant="info">Vorschau</Badge> : null}
      </div>
      {heroStage.stageKind !== 'special' ? (
        <div className={chainStyles.familyProgressBlock}>
          <div
            role="progressbar"
            aria-label={`Fortschritt für ${family.label}`}
            aria-valuemin={0}
            aria-valuenow={progressValue}
            aria-valuemax={progressMax}
            className={chainStyles.familyProgressTrack}
          >
            <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
          </div>
          <p className={chainStyles.familyProgressCopy}>{progressCopy}</p>
        </div>
      ) : null}
      {heroStage.stageKind !== 'special' ? (
        <div ref={stripRef} className={chainStyles.familyStages} role="list" aria-label={`Stufen für ${family.label}`} data-badge-stage-strip>
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
              <span key={stage.badge_code} role="listitem" className={chainStyles.familyStageItem}>
                {stage.earned ? (
                  <button
                    type="button"
                    className={`${chainStyles.familyStageButton} ${active ? chainStyles.familyStageButtonActive : ''}`}
                    aria-label={`${label} auswählen${current ? ', Aktuell' : ''}`}
                    aria-pressed={selected}
                    data-current={current ? 'true' : undefined}
                    data-stage-code={stage.badge_code}
                    data-active={active ? 'true' : undefined}
                    onClick={() => chooseStage(stage.badge_code)}
                    onKeyDown={(event) => handleStageKey(event, stage.badge_code)}
                  >
                    <span className={`${chainStyles.familyStageArtwork} ${layeredStageArtwork ? layeredBadgeArtworkStyles.badgeArtworkLayered : ''}`}>
                      {layeredStageArtwork ? (
                        <>
                          <span className={layeredBadgeArtworkStyles.roleArtworkBackdrop} aria-hidden="true" />
                          <ResponsiveImage className={layeredBadgeArtworkStyles.roleArtworkMotif} src={layeredStageArtwork.motifSrc} alt="" width={72} height={72} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" />
                          <ResponsiveImage className={layeredBadgeArtworkStyles.roleArtworkFrame} src={layeredStageArtwork.frameSrc} alt="" width={72} height={72} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" />
                        </>
                      ) : artwork ? <ResponsiveImage src={artwork} alt="" width={72} height={72} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" /> : <StageIcon size={24} aria-hidden="true" />}
                    </span>
                    <span>{label}</span>
                    {current ? <span className={chainStyles.currentChip}>Aktuell</span> : null}
                  </button>
                ) : (
                  <span className={chainStyles.familyStageLocked} aria-label={`${label} · Gesperrt`}>
                    <LockedStageArtwork className={chainStyles.familyStageArtwork} />
                    <span>{label}</span>
                    <span className={chainStyles.visuallyHidden}>Gesperrt</span>
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
    <Card className={chainStyles.animeProjectStage} data-family={family.key} data-anime-project-stage>
      <h3 className={chainStyles.animeProjectTitle}>Anime-Projekte</h3>
      <div className={chainStyles.animeProjectHero}>
        <span className={`${chainStyles.animeProjectArtwork} ${layeredArtwork ? layeredBadgeArtworkStyles.badgeArtworkLayered : ''}`} data-anime-project-art={heroStage.badge_code}>
          {layeredArtwork ? (
            <>
              <span className={`${layeredBadgeArtworkStyles.roleArtworkMist} ${chainStyles.roleArtworkMist}`} aria-hidden="true" />
              <span className={`${layeredBadgeArtworkStyles.roleArtworkBackdrop} ${chainStyles.roleArtworkBackdrop}`} aria-hidden="true" />
              <ResponsiveImage className={`${layeredBadgeArtworkStyles.roleArtworkMotif} ${chainStyles.roleArtworkMotif}`} src={layeredArtwork.motifSrc} alt="" width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} aria-hidden="true" />
              <ResponsiveImage className={layeredBadgeArtworkStyles.roleArtworkFrame} src={layeredArtwork.frameSrc} alt={heroStage.label} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
            </>
          ) : artwork ? (
            <ResponsiveImage src={artwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} />
          ) : (
            <HeroIcon size={96} aria-label={heroStage.label} />
          )}
        </span>
        <div className={chainStyles.animeProjectInfo} aria-live="polite">
          <div className={chainStyles.animeProjectStatus}>
            <Badge variant={presentation.variant}>{rank}</Badge>
            {selectedStage ? <Badge variant="info">Vorschau</Badge> : null}
          </div>
          <strong className={chainStyles.animeProjectCount}>{count} {unit}</strong>
          <div className={chainStyles.animeProjectProgressValue}><span>{progressValue} / {progressMax}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label="Fortschritt für Anime-Projekte" aria-valuemin={0} aria-valuenow={count} aria-valuemax={progressMax} className={chainStyles.animeProjectProgressTrack}>
            <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
          </div>
          <p className={chainStyles.animeProjectNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${family.remainingCount ?? 0} Anime-Projekte bis ${nextRank}`}</p>
          {selectedStage ? <p className={chainStyles.visuallyHidden}>Vorschau der bereits erreichten Stufe {rank}. Der Fortschritt zeigt weiterhin den aktuellen Stand.</p> : null}
        </div>
      </div>
      <ol className={chainStyles.animeProjectMilestones} aria-label="Stufen für Anime-Projekte">
        {family.stages.map((stage) => {
          const current = stage.badge_code === currentCode
          const selected = stage.badge_code === selectedCode
          const stagePresentation = getMemberBadgePresentation(stage.badge_code)
          const label = stage.badge_code === 'first_contribution' ? 'Erste Mitwirkung' : (stagePresentation.label.split(' · ').at(-1) ?? stagePresentation.label)
          const content = <>{stage.earned ? <span className={chainStyles.animeProjectMarker} aria-hidden="true">{current ? '★' : '●'}</span> : <LockedStageArtwork className={chainStyles.animeProjectMarker} />}<span className={chainStyles.animeProjectMilestoneName}>{label}</span><span className={chainStyles.animeProjectThreshold}>{stage.threshold}</span>{current ? <span className={chainStyles.currentChip}>Aktuell</span> : null}{!stage.earned ? <span className={chainStyles.visuallyHidden}>Gesperrt</span> : null}</>
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
    <Card className={chainStyles.contributionAchievementStage} data-family={family.key} data-contribution-achievement-stage>
      <h3 className={chainStyles.contributionStageTitle}>{family.label}</h3>
      <div className={chainStyles.contributionStageHero}>
        <span className={chainStyles.contributionHeroArtwork} data-contribution-art={heroStage.badge_code}>
          {currentCode ? (artwork ? <ResponsiveImage src={artwork} alt={heroStage.label} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} /> : <HeroIcon size={96} aria-label={heroStage.label} />) : <LockedStageArtwork hero />}
        </span>
        <div className={chainStyles.contributionStageInfo} aria-live="polite">
          <div className={chainStyles.contributionStageStatus}><Badge variant={currentCode ? presentation.variant : 'muted'}>{tierLabel(heroStage.badge_code)}</Badge><Badge variant={selectedStage ? 'info' : currentCode ? 'success' : 'muted'}>{selectedStage ? 'Vorschau' : currentCode ? 'Aktuell' : 'Gesperrt'}</Badge></div>
          <strong className={chainStyles.contributionStageCount}>{count} {unit}</strong>
          <div className={chainStyles.contributionStageProgressValue}><span>{progressValue} / {progressMax}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label={`Fortschritt für ${family.label}`} aria-valuemin={0} aria-valuenow={progressValue} aria-valuemax={progressMax} className={chainStyles.contributionStageProgressTrack}><span style={{ width: `${family.complete ? 100 : progressPercent}%` }} /></div>
          <p className={chainStyles.contributionStageNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${family.remainingCount ?? 0} ${family.remainingCount === 1 ? family.unitSingular : family.unitPlural} bis ${nextTier}`}</p>
          {selectedStage ? <p className={chainStyles.visuallyHidden}>Vorschau der bereits erreichten Stufe {tierLabel(heroStage.badge_code)}. Der Fortschritt zeigt weiterhin den aktuellen Stand.</p> : null}
        </div>
      </div>
      <ol className={chainStyles.contributionTierTrack} aria-label={`Stufen für ${family.label}`}>
        {family.stages.map((stage) => {
          const current = stage.badge_code === currentCode
          const selected = (selectedCode ?? currentCode) === stage.badge_code
          const stagePresentation = getMemberBadgePresentation(stage.badge_code)
          const stageArtwork = stage.earned ? resolveBadgeArtwork(stage.badge_code) : undefined
          const StageIcon = stagePresentation.Icon
          const tier = tierLabel(stage.badge_code)
          const state = current ? 'Aktuell' : stage.earned ? '' : 'Gesperrt'
          const content = <>{stage.earned ? <span className={chainStyles.contributionTierArtwork}>{stageArtwork ? <ResponsiveImage src={stageArtwork} alt="" width={160} height={160} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" data-achievement-art={stage.badge_code} /> : <StageIcon size={32} aria-hidden="true" />}</span> : <LockedStageArtwork className={chainStyles.contributionTierArtwork} />}<span className={chainStyles.contributionTierName}>{tier}</span><span className={chainStyles.contributionTierState}>{state === 'Gesperrt' ? <Lock size={12} aria-hidden="true" /> : null}{state}</span></>
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
    <Card className={chainStyles.membershipStage} data-family={family.key} data-membership-stage>
      <div className={chainStyles.membershipStageHero}>
        <span className={chainStyles.membershipHeroArtwork} data-membership-art={heroStage.badge_code}>
          {currentCode || foundingPreview ? (artwork ? <ResponsiveImage src={artwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} /> : <HeroIcon size={96} aria-label={heroStage.label} />) : <LockedStageArtwork hero />}
        </span>
        <div className={chainStyles.membershipStageInfo} aria-live="polite">
          <h3 className={chainStyles.membershipHeroTitle}>{foundingPreview ? 'Besondere Mitgliedschaft' : 'Mitgliedsdauer'}</h3>
          <div className={chainStyles.membershipStageStatus}><Badge variant={currentCode || foundingPreview ? presentation.variant : 'muted'}>{foundingPreview ? 'Gründungsmitglied' : presentation.label}</Badge><Badge variant={foundingPreview || selectedStage ? 'info' : currentCode ? 'success' : 'muted'}>{foundingPreview || selectedStage ? 'Vorschau' : currentCode ? 'Aktuell' : 'Gesperrt'}</Badge></div>
          {foundingPreview ? <p className={chainStyles.membershipHeroDescription}>Seit der Gründung dabei</p> : null}
          <strong className={chainStyles.membershipStageCount}>{count} {count === 1 ? family.unitSingular : family.unitPlural}</strong>
          <div className={chainStyles.membershipProgressValue}><span>{progressValue} / {progressMax}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label="Fortschritt für Mitgliedschaft" aria-valuemin={0} aria-valuenow={progressValue} aria-valuemax={progressMax} className={chainStyles.membershipProgressTrack}><span style={{ width: `${family.complete ? 100 : progressPercent}%` }} /></div>
          <p className={chainStyles.membershipStageNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${family.remainingCount ?? 0} ${family.remainingCount === 1 ? 'Jahr' : 'Jahre'} bis ${nextLabel}`}</p>
          {foundingPreview || selectedStage ? <p className={chainStyles.visuallyHidden}>Vorschau einer bereits erreichten Mitgliedschaftsauszeichnung. Der Fortschritt zeigt weiterhin den aktuellen Stand.</p> : null}
        </div>
      </div>
      <ol className={chainStyles.membershipDurationTrack} aria-label="Dauerstufen der Mitgliedschaft" data-membership-duration-track>
        {family.stages.map((stage) => {
          const current = stage.badge_code === currentCode
          const selected = stage.badge_code === selectedCode || (selectedCode === null && current)
          const stageArtwork = stage.earned ? resolveBadgeArtwork(stage.badge_code) : undefined
          const StageIcon = getMemberBadgePresentation(stage.badge_code).Icon
          const label = `${stage.threshold} Jahre Mitgliedschaft`
          const content = <>{stage.earned ? <span className={chainStyles.membershipStageArtwork}>{stageArtwork ? <ResponsiveImage src={stageArtwork} alt="" width={160} height={160} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" data-achievement-art={stage.badge_code} /> : <StageIcon size={32} aria-hidden="true" />}</span> : <LockedStageArtwork className={chainStyles.membershipStageArtwork} />}<span className={chainStyles.membershipStageName}>{stage.threshold} Jahre</span><span className={chainStyles.membershipStageState}>{current ? 'Aktuell' : stage.earned ? 'Erreicht' : <><Lock size={12} aria-hidden="true" /> Gesperrt</>}</span></>
          return <li key={stage.badge_code} data-badge-code={stage.badge_code} data-threshold={stage.threshold} data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'} aria-current={current ? 'step' : undefined}>{stage.earned ? <button type="button" aria-label={`${label} auswählen${current ? ', Aktuell' : ''}`} aria-pressed={selected} onClick={() => setSelectedCode(current ? null : stage.badge_code)}>{content}</button> : <span aria-label={`${label} · Gesperrt`}>{content}</span>}</li>
        })}
      </ol>
      {family.foundingStage ? <aside className={chainStyles.foundingMemberPanel} data-founding-member aria-label="Besondere Mitgliedschaft">
        <button type="button" className={chainStyles.foundingMemberButton} aria-label="Gründungsmitglied Vorschau" aria-pressed={foundingPreview} onClick={() => setSelectedCode(foundingPreview ? null : family.foundingStage!.badge_code)}>
          <span className={chainStyles.foundingMemberArtwork}>{!foundingPreview && resolveBadgeArtwork(family.foundingStage.badge_code) ? <ResponsiveImage src={resolveBadgeArtwork(family.foundingStage.badge_code)!} alt="" width={192} height={192} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" data-achievement-art={family.foundingStage.badge_code} /> : null}</span>
          <span className={chainStyles.foundingMemberCopy}><strong>Besondere Mitgliedschaft</strong><span className={chainStyles.foundingMemberLabel}>Gründungsmitglied</span><span className={chainStyles.foundingMemberDescription}>Seit der Gründung dabei</span></span>
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
    <Card className={chainStyles.pointsAchievementStage} data-family={family.key} data-points-achievement-stage>
      <div className={chainStyles.pointsStageHero}>
        <span className={chainStyles.pointsHeroArtwork}>{currentCode ? (artwork ? <ResponsiveImage src={artwork} alt={heroStage.label} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={heroStage.badge_code} /> : <HeroIcon size={96} aria-label={heroStage.label} />) : <LockedStageArtwork hero />}</span>
        <div className={chainStyles.pointsStageInfo} aria-live="polite">
          {currentCode ? <div className={chainStyles.pointsStageStatus}><Badge variant={presentation.variant}>{presentation.label}</Badge>{selectedStage ? <Badge variant="info">Vorschau</Badge> : null}</div> : null}
          <strong className={chainStyles.pointsStageCount}>{formatPoints(count)} Punkte{selectedStage ? ' aktuell' : ''}</strong>
          <div className={chainStyles.pointsProgressValue}><span>{formatPoints(progressValue)} / {formatPoints(progressMax)}</span><span>{Math.round(progressPercent)} %</span></div>
          <div role="progressbar" aria-label="Fortschritt für Punkte" aria-valuemin={0} aria-valuenow={progressValue} aria-valuemax={progressMax} className={chainStyles.pointsProgressTrack}><span style={{ width: `${family.complete ? 100 : progressPercent}%` }} /></div>
          <p className={chainStyles.pointsStageNext}>{family.complete ? 'Höchste Stufe erreicht' : `Noch ${formatPoints(family.remainingCount ?? 0)} Punkte bis ${nextLabel}`}</p>
        </div>
      </div>
      <ol className={chainStyles.pointsStageTrack} aria-label="Punkte-Meilensteine">{family.stages.map((stage) => {
        const current = stage.badge_code === currentCode
        const selected = stage.badge_code === selectedCode
        const stagePresentation = getMemberBadgePresentation(stage.badge_code)
        const stageArtwork = stage.earned ? resolveBadgeArtwork(stage.badge_code) : undefined
        const StageIcon = stagePresentation.Icon
        const content = <>{stage.earned ? <span className={chainStyles.pointsStageArtwork}>{stageArtwork ? <ResponsiveImage src={stageArtwork} alt="" width={160} height={160} sizes={COMPACT_BADGE_SIZES} aria-hidden="true" /> : <StageIcon size={32} aria-hidden="true" />}</span> : <LockedStageArtwork className={chainStyles.pointsStageArtwork} />}<span className={chainStyles.pointsStageName}>Stufe: {stagePresentation.label}</span><span className={chainStyles.pointsStageThreshold}>Ab {formatPoints(stage.threshold)} Punkten</span><span className={chainStyles.pointsStageState}>{current ? 'Aktuell' : stage.earned ? 'Erreicht' : <><Lock size={12} aria-hidden="true" /> Gesperrt</>}</span></>
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
                    {earnedRoleCodes.size} {earnedRoleCodes.size === 1
                      ? 'ausgeübte Fansubrolle'
                      : 'ausgeübte Fansubrollen'}
                  </span>
                </div>
              ) : null}
              <div className={chainStyles.carouselShell}>
                <div className={chainStyles.carouselSkeleton} aria-hidden="true" data-badge-skeleton>
                  <span className={chainStyles.skeletonControl} />
                  <span className={chainStyles.skeletonCard} />
                  <span className={chainStyles.skeletonControl} />
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
                carouselClassName={chainStyles.chain}
                itemClassName={chainStyles.badgeWindow}
                activeItemClassName={chainStyles.badgeWindowActive}
                gridClassName={chainStyles.badgeGrid}
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
                        className={chainStyles.roleBadgeRow}
                        data-role-code={row.key}
                        data-role-card-state={state.expanded ? 'expanded' : state.active ? 'active' : 'inactive'}
                        data-active={state.active ? 'true' : 'false'}
                        data-expanded={state.expanded ? 'true' : 'false'}
                      >
                        <h3 className={chainStyles.roleLabel}>{roleLabel}:</h3>
                        {artworkItem && artworkSrc ? (
                          <span className={`${chainStyles.roleHeroArtwork} ${layeredRoleArtwork ? layeredBadgeArtworkStyles.roleHeroArtworkLayered : ''}`}>
                            {layeredRoleArtwork ? (
                              <>
                                <span className={layeredBadgeArtworkStyles.roleArtworkMist} aria-hidden="true" />
                                <span className={`${layeredBadgeArtworkStyles.roleArtworkBackdrop} ${chainStyles.roleArtworkBackdrop}`} aria-hidden="true" />
                                <ResponsiveImage className={`${layeredBadgeArtworkStyles.roleArtworkMotif} ${chainStyles.roleArtworkMotif}`} src={layeredRoleArtwork.motifSrc} alt="" width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} aria-hidden="true" />
                                <ResponsiveImage className={layeredBadgeArtworkStyles.roleArtworkFrame} src={layeredRoleArtwork.frameSrc} alt={heroAlt} width={1254} height={1254} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={artworkItem.badge_code} />
                              </>
                            ) : (
                              <ResponsiveImage src={artworkSrc} alt={heroAlt} width={512} height={512} sizes={ACTIVE_BADGE_SIZES} data-achievement-art={artworkItem.badge_code} />
                            )}
                          </span>
                        ) : null}
                        <div className={chainStyles.roleStatus}>
                          <Badge variant={getMemberBadgePresentation(artworkItem?.badge_code ?? '').variant}>{progress.tierLabel}</Badge>
                          <strong className={chainStyles.roleCount}>{count} Mitwirkungen</strong>
                        </div>
                        <div className={chainStyles.roleProgressBlock}>
                          <div className={chainStyles.roleProgressValue}>
                            <span>{progress.progressValue} / {progress.progressMax}</span>
                            <span>{Math.round(progress.progressPercent)}%</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`Fortschritt für ${roleLabel}`}
                            aria-valuemin={0}
                            aria-valuenow={progress.progressValue}
                            aria-valuemax={progress.progressMax}
                            className={chainStyles.roleProgressTrack}
                          >
                            <span style={{ width: `${progress.progressPercent}%` }} />
                          </div>
                          <p className={chainStyles.roleNextCopy}>{progress.nextCopy}</p>
                        </div>
                        <ol className={chainStyles.roleProgression} aria-label={`Medaillen für ${roleLabel}`}>
                          {progress.stages.map((stage, index) => {
                            const current = stage.state === 'current'
                            const item = row.items[index]
                            return (
                              <li key={stage.tier} className={stage.state === 'locked' ? chainStyles.roleStageLocked : chainStyles.roleStageEarned} data-role-stage={stage.label.toLowerCase()} data-role-stage-state={stage.state} data-palette={item ? getMemberBadgePresentation(item.badge_code).palette : undefined} data-role-volume={item?.badge_code.startsWith('role_volume_') ? 'true' : undefined} aria-current={current ? 'step' : undefined} aria-label={stage.state === 'locked' ? `${stage.label} · ${stage.threshold}+ gesperrt` : undefined}>
                                {stage.state === 'locked' ? <LockedStageArtwork className={chainStyles.roleStageMarker} /> : <span className={chainStyles.roleStageMarker} aria-hidden="true"><Lock size={13} /></span>}
                                <span className={chainStyles.roleStageName}>{stage.label}</span>
                                <span className={chainStyles.roleStageThreshold}>{stage.threshold}+</span>
                                <span className={chainStyles.currentChip}>{current ? 'Aktuell' : ''}</span>
                                <span className={chainStyles.roleStageState}>{stage.state === 'locked' ? 'Gesperrt' : ''}</span>
                                <span className={chainStyles.visuallyHidden}>{index === 0 ? item?.label ?? stage.label : ''}</span>
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
                        ? chainStyles.badgeRow
                        : `${chainStyles.badgeRow} ${chainStyles.badgeRowCompact}`}
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
                          className={isEarned ? chainStyles.badgeStep : chainStyles.badgeStepLocked}
                          data-palette={presentation.palette}
                          data-earned={isEarned ? 'true' : 'false'}
                          data-contribution-tier={earnedBadge?.current_tier ?? undefined}
                          data-role-volume={item.badge_code.startsWith('role_volume_') ? 'true' : undefined}
                        >
                          <span className={imageSrc && isEarned ? chainStyles.badgeItemWithImage : chainStyles.badgeItem}>
                            <span
                              className={imageSrc && isEarned
                                ? `${chainStyles.badgeArtwork} ${layeredProgressArtwork ? layeredBadgeArtworkStyles.badgeArtworkLayered : ''}`
                                : chainStyles.badgeIcon}
                              aria-label={isEarned ? undefined : `${item.label} gesperrt`}
                            >
                              {isEarned && layeredProgressArtwork ? (
                                <>
                                  <span className={layeredBadgeArtworkStyles.roleArtworkMist} aria-hidden="true" />
                                  <span className={layeredBadgeArtworkStyles.roleArtworkBackdrop} aria-hidden="true" />
                                  <ResponsiveImage
                                    className={layeredBadgeArtworkStyles.roleArtworkMotif}
                                    src={layeredProgressArtwork.motifSrc}
                                    alt=""
                                    width={1254}
                                    height={1254}
                                    sizes={ACTIVE_BADGE_SIZES}
                                    aria-hidden="true"
                                  />
                                  <ResponsiveImage
                                    className={layeredBadgeArtworkStyles.roleArtworkFrame}
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
                            <span className={chainStyles.badgeText}>
                              <span>{item.label}</span>
                              {presentation.detailLabel ? (
                                <span className={chainStyles.badgeDetail}>{presentation.detailLabel}</span>
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
            <div key={group.key} className={chainStyles.group} data-badge-group={group.key}>
              <SectionHeader title={group.label} underline />
              {group.key === 'progress' ? (
                <AnimeProjectAchievementStage key={`${group.families[0].currentCount}:${group.families[0].currentStage?.badge_code ?? ''}`} family={group.families[0]} />
              ) : group.key === 'points' ? (
                <PointsAchievementStage key={`${group.families[0].currentCount}:${group.families[0].currentStage?.badge_code ?? ''}`} family={group.families[0]} />
              ) : group.key === 'membership' ? (
                <MembershipStage key={`${group.families[0].currentCount}:${group.families[0].currentStage?.badge_code ?? ''}`} family={group.families[0]} />
              ) : <div className={chainStyles.carouselShell}>
                {group.key === 'contributions' ? null : <div className={chainStyles.carouselSkeleton} aria-hidden="true" data-badge-skeleton>
                  <span className={chainStyles.skeletonControl} />
                  <span className={chainStyles.skeletonCard} />
                  <span className={chainStyles.skeletonControl} />
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
                carouselClassName={`${chainStyles.chain} ${group.key === 'special' ? chainStyles.specialChain : ''}`}
                itemClassName={chainStyles.badgeWindow}
                activeItemClassName={chainStyles.badgeWindowActive}
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
