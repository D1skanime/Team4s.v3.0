// Phase 150 (D-19/Task 3): abgespalten aus memberBadgeLabels.ts, weil dessen Zeilenzahl nach
// dem Threshold-Rueckbau (D-25) immer noch ueber CLAUDE.md's 450-Zeilen-Limit lag. Reiner
// Datei-Move -- kein neuer Export, kein Verhaltensunterschied. memberBadgeLabels.ts behaelt
// MEMBER_BADGE_PRESENTATIONS, die Gruppen-Label/Reihenfolge-Konstanten,
// PUBLIC_MEMBER_BADGE_CATALOG, formatMemberBadgeLabel und getMemberBadgePresentation; diese
// Datei uebernimmt die Rollen-Fortschritts-Praesentation und den Badge-Familien-Resolver.
import { Gem, Medal, Sparkles, type LucideIcon } from 'lucide-react'

import type { PublicMemberBadgeProgress } from '@/types/profile'

import {
  getMemberBadgePresentation,
  ROLE_VOLUME_TIERS,
  type MemberBadgeGroup,
  type MemberBadgePresentation,
  type MemberBadgeVariant,
  type PublicMemberBadgeCatalogItem,
  type RoleVolumeTier,
} from './memberBadgeLabels'

export type MemberBadgeFamilyStage = PublicMemberBadgeCatalogItem & {
  family: string
  threshold: number
  order: number
  stageKind: 'progress' | 'special'
  earned: boolean
  locked: boolean
}

export type MemberBadgeFamilyPresentation = {
  key: string
  group: Exclude<MemberBadgeGroup, 'roles'>
  label: string
  stages: MemberBadgeFamilyStage[]
  foundingStage: MemberBadgeFamilyStage | null
  currentStage: MemberBadgeFamilyStage | null
  nextStage: MemberBadgeFamilyStage | null
  heroStage: MemberBadgeFamilyStage
  currentCount: number | null
  nextThreshold: number | null
  remainingCount: number | null
  complete: boolean
  unitSingular: string
  unitPlural: string
}

// D-29: reine Praesentation (Label pro Tier-CODE, keine Schwellenzahl) -- die Autoritaet
// ueber Tier/Schwelle liegt seit Phase 150 vollstaendig beim Server.
const ROLE_VOLUME_TIER_LABELS: Record<RoleVolumeTier, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin',
}

// D-29: reine Praesentation (Badge-Variant pro Tier-CODE, keine Schwellenzahl) -- die
// Autoritaet ueber Tier/Schwelle liegt seit Phase 150 vollstaendig beim Server.
const ROLE_VOLUME_TIER_VARIANTS: Record<RoleVolumeTier, MemberBadgeVariant> = {
  bronze: 'muted',
  silver: 'neutral',
  gold: 'warning',
  platinum: 'info',
}

// D-29: reine Praesentation (Icon pro Tier-CODE, keine Schwellenzahl) -- die Autoritaet
// ueber Tier/Schwelle liegt seit Phase 150 vollstaendig beim Server.
const ROLE_VOLUME_TIER_ICONS: Record<RoleVolumeTier, LucideIcon> = {
  bronze: Medal,
  silver: Medal,
  gold: Medal,
  platinum: Gem,
}

// D-04: dynamischer Resolver fuer role_volume_<roleCode>_<tier>-Codes — loest keine
// hartcodierte Rollenliste auf. Liefert den geparsten Rollencode als Merge-Schluessel fuer
// buildMemberBadgeGroups (Plan 112-03); die Aufloesung des deutschen Rollennamens fuer das
// Zeilen-Präfix wird beim Rendern über den zentralen Rollenkatalog aufgelöst.
//
// D-29 (sechste Fundstelle): das Label ist seit Phase 150 nur noch der nackte Tier-Name
// (z. B. "Gold", ohne "· <Zahl>+"-Suffix) -- diese Funktion hat nach dem Rueckbau von
// ROLE_VOLUME_TIER_THRESHOLDS keine legitime Quelle mehr fuer die Schwellenzahl. Der
// sichtbare "<Label> · <Zahl>+"-String bleibt trotzdem byte-identisch erhalten: er wird an
// den Aufrufstellen, die die Zahl bereits serverautoritativ vorliegen haben, rekonstruiert
// (CategoryProgressTable.tsx's buildRoleVolumeRow via entry.current_threshold; nach Plan
// 150-07 zusaetzlich AchievementBadgesCard.tsx via badge.current_threshold).
export function resolveRoleVolumePresentation(badgeCode: string): MemberBadgePresentation {
  const withoutPrefix = badgeCode.slice('role_volume_'.length)
  const tier = ROLE_VOLUME_TIERS.find((candidate) => withoutPrefix.endsWith(`_${candidate}`))

  if (!tier) {
    // Defensiv: unbekanntes/unerwartetes Tier-Suffix faellt auf den generischen Fallback
    // zurueck statt zu werfen (mirror des bestehenden getMemberBadgePresentation-Fallbacks).
    return { label: badgeCode, variant: 'neutral', Icon: Sparkles, palette: 'mint', group: 'special' }
  }

  // roleCode ist der Merge-Schluessel (Plan 112-03 buildMemberBadgeGroups); der aufgeloeste
  // deutsche Rollenname selbst wird erst beim Zeilen-Render (Plan 112-03, .roleLabel-Praefix)
  // über denselben zentralen Katalog gebraucht; hier reicht der Code.
  const roleCode = withoutPrefix.slice(0, -(tier.length + 1))

  return {
    label: ROLE_VOLUME_TIER_LABELS[tier],
    variant: ROLE_VOLUME_TIER_VARIANTS[tier],
    Icon: ROLE_VOLUME_TIER_ICONS[tier],
    palette: tier,
    group: 'roles',
    roleCode,
  }
}

export type RoleProgressTier = 'entry' | RoleVolumeTier

export type RoleProgressPresentation = {
  tier: RoleProgressTier | null
  nextThreshold: number | null
  nextTierLabel: string | null
  tierLabel: string
  rankLabel: string
  progressCopy: string
  nextCopy: string
  progressValue: number
  progressMax: number
  progressPercent: number
  stages: RoleProgressStagePresentation[]
}

export type RoleProgressStagePresentation = {
  tier: RoleProgressTier
  threshold: number
  label: string
  state: 'reached' | 'current' | 'locked'
}

// D-25: Labels sind reine Praesentation und bleiben lokal -- der Server liefert pro Stufe
// nur {code, threshold} (PublicMemberBadgeProgressStage), kein Label. "entry" ist die
// backend-synthetisierte Einstiegs-Stufe (Schwelle 1, siehe Plan 150-03/D-24).
const ROLE_PROGRESS_STAGE_LABELS: Record<RoleProgressTier, string> = {
  entry: 'Einstieg',
  ...ROLE_VOLUME_TIER_LABELS,
}

// D-25/D-26: liest Tier/naechste Schwelle/Rest/Stufenliste ausschliesslich aus dem
// server-gelieferten role_volume-badge_progress-Eintrag (entry.stages, entry.current_count)
// -- kein eigenes Schwellen-Literal mehr. `entry` ist `undefined` nur in einem defensiven,
// in Produktion unerreichbaren Pfad (jede Rolle in roleCounts hat einen passenden
// role_volume-Eintrag, siehe MemberBadgeChain.tsx); in diesem Fall bleiben
// nextThreshold/nextTierLabel bewusst `null` statt auf ein Literal zurueckzufallen.
export function resolveRoleProgressPresentation(
  entry: PublicMemberBadgeProgress | undefined,
  fallbackCount = 0,
): RoleProgressPresentation {
  const stages = (entry?.stages ?? []).map((stage) => ({
    tier: stage.code as RoleProgressTier,
    threshold: stage.threshold,
    label: ROLE_PROGRESS_STAGE_LABELS[stage.code as RoleProgressTier],
  }))
  const safeCount = Math.max(0, entry?.current_count ?? fallbackCount)
  const current = [...stages].reverse().find((stage) => safeCount >= stage.threshold)
  const currentIndex = current ? stages.indexOf(current) : -1
  const next = safeCount === 0
    ? stages[1] ?? null
    : stages[currentIndex + 1] ?? null
  const progressMax = next?.threshold ?? stages.at(-1)?.threshold ?? 0
  const progressValue = Math.min(safeCount, progressMax)
  const remainingCount = next ? Math.max(0, next.threshold - safeCount) : null

  return {
    tier: current?.tier ?? null,
    nextThreshold: next?.threshold ?? null,
    nextTierLabel: next?.label ?? null,
    tierLabel: current?.label ?? '',
    rankLabel: current ? `${current.label} · ${current.threshold}+` : '',
    progressCopy: next
      ? `${safeCount} von ${next.threshold} Mitwirkungen · Noch ${remainingCount} bis ${next.label}`
      : `${safeCount} Mitwirkungen · Höchste Stufe erreicht`,
    nextCopy: next
      ? `Noch ${remainingCount} Mitwirkungen bis ${next.label}`
      : 'Höchste Stufe erreicht',
    progressValue,
    progressMax,
    progressPercent: progressMax > 0 ? Math.max(0, Math.min(100, (progressValue / progressMax) * 100)) : 0,
    stages: stages.map((stage, index) => ({
      ...stage,
      state: index === currentIndex
        ? 'current'
        : index < currentIndex ? 'reached' : 'locked',
    })),
  }
}

const FAMILY_ORDER = [
  'progress',
  'points',
  'contribution_projects',
  'contribution_chronicle',
  'contribution_archivist',
  'membership',
] as const

// D-25: FAMILY_DEFINITIONS traegt nach dem Umbau ausschliesslich Praesentation
// (group/label/unitSingular/unitPlural) -- die Stufenliste selbst kommt seit Phase 150
// nicht mehr aus einem lokalen Inline-Array, sondern aus dem passenden
// badge_progress[].stages-Eintrag (siehe resolveMemberBadgeFamilies unten).
const FAMILY_DEFINITIONS: Record<(typeof FAMILY_ORDER)[number], {
  group: MemberBadgeFamilyPresentation['group']
  label: string
  unitSingular: string
  unitPlural: string
}> = {
  progress: {
    group: 'progress', label: 'Anime-Projekte', unitSingular: 'Anime-Projekt', unitPlural: 'Anime-Projekte',
  },
  points: {
    group: 'points', label: 'Punkte-Meilensteine', unitSingular: 'Punkt', unitPlural: 'Punkte',
  },
  contribution_projects: {
    group: 'contributions', label: 'Mitgetragene Projekte', unitSingular: 'mitgetragenes Projekt', unitPlural: 'mitgetragene Projekte',
  },
  contribution_chronicle: {
    group: 'contributions', label: 'Chronikpflege', unitSingular: 'Chronikbeitrag', unitPlural: 'Chronikbeiträge',
  },
  contribution_archivist: {
    group: 'contributions', label: 'Bildarchivpflege', unitSingular: 'Medienbeitrag', unitPlural: 'Medienbeiträge',
  },
  membership: {
    group: 'membership', label: 'Mitgliedschaft', unitSingular: 'Jahr Mitgliedschaft', unitPlural: 'Jahre Mitgliedschaft',
  },
}

// D-24/D-25: die drei Contribution-Familien liefern ihre Stufen-Codes als nackte
// Tier-Token (bronze/silver/gold, wie current_tier es auch schon tut) -- fuer
// badge_code/getMemberBadgePresentation-Lookups muss der volle Code
// `${family}_${tier}` gebildet werden. Alle anderen Familien senden bereits den vollen
// badge_code als Stufen-Code.
const CONTRIBUTION_FAMILY_KEYS = new Set<(typeof FAMILY_ORDER)[number]>([
  'contribution_projects',
  'contribution_chronicle',
  'contribution_archivist',
])

function stageBadgeCode(familyKey: (typeof FAMILY_ORDER)[number], code: string): string {
  return CONTRIBUTION_FAMILY_KEYS.has(familyKey) ? `${familyKey}_${code}` : code
}

function familyStage(
  item: Pick<PublicMemberBadgeCatalogItem, 'badge_code' | 'label' | 'badge_category'> & Partial<PublicMemberBadgeCatalogItem>,
  family: string,
  threshold: number,
  order: number,
  earnedCodes: ReadonlySet<string>,
): MemberBadgeFamilyStage {
  const earned = earnedCodes.has(item.badge_code)
  return { ...item, family, threshold, order, stageKind: 'progress', earned, locked: !earned }
}

export function resolveMemberBadgeFamilies(input: {
  earned_codes: string[]
  badge_progress: PublicMemberBadgeProgress[]
  catalog?: Array<Pick<PublicMemberBadgeCatalogItem, 'badge_code' | 'label'> & Partial<PublicMemberBadgeCatalogItem>>
}): MemberBadgeFamilyPresentation[] {
  const earnedCodes = new Set(input.earned_codes)
  const progressByFamily = new Map(input.badge_progress.map((progress) => [progress.family, progress]))
  const ownedCodes = new Set<string>()
  const customCatalog = input.catalog
  const families: MemberBadgeFamilyPresentation[] = []

  for (const key of FAMILY_ORDER) {
    const definition = FAMILY_DEFINITIONS[key]
    const progress = progressByFamily.get(key)
    const foundingStage = key === 'membership' && earnedCodes.has('founding_member')
      ? familyStage({
          badge_code: 'founding_member',
          label: getMemberBadgePresentation('founding_member').label,
          badge_category: definition.group,
        }, key, 0, 0, earnedCodes)
      : null
    if (key === 'membership') {
      // Founding belongs to membership but is independent from duration progression.
      ownedCodes.add('founding_member')
    }
    const sourceStages = customCatalog && key === 'progress'
      ? customCatalog.map((item, index) => ({
          badge_code: item.badge_code,
          threshold: item.threshold ?? index,
          label: item.label,
          badge_category: item.badge_category ?? 'quantity',
        }))
      : (progress?.stages ?? []).map((stage) => {
          const badge_code = stageBadgeCode(key, stage.code)
          return {
            badge_code,
            threshold: stage.threshold,
            label: getMemberBadgePresentation(badge_code).label,
            badge_category: definition.group,
          }
        })
    const stages = sourceStages
      .filter((stage) => !ownedCodes.has(stage.badge_code))
      .sort((a, b) => a.threshold - b.threshold || a.badge_code.localeCompare(b.badge_code))
      .map((stage, index) => {
        ownedCodes.add(stage.badge_code)
        const reachedByAuthoritativeProgress = progress != null
          && progress.current_count >= stage.threshold
        const stageEarnedCodes = reachedByAuthoritativeProgress
          ? new Set([...earnedCodes, stage.badge_code])
          : earnedCodes
        return familyStage(stage, key, stage.threshold, index, stageEarnedCodes)
      })
    const currentStage = [...stages].reverse().find((stage) => stage.earned) ?? null
    const nextStage = stages.find((stage) => !stage.earned && stage.threshold > (currentStage?.threshold ?? -1)) ?? null

    if (!progress && !currentStage && !foundingStage) continue
    const heroStage = currentStage ?? nextStage ?? stages[0]
    if (!heroStage) continue
    families.push({
      key, group: definition.group, label: definition.label, stages, foundingStage, currentStage, nextStage, heroStage,
      currentCount: progress?.current_count ?? null,
      nextThreshold: progress?.next_threshold ?? null,
      remainingCount: progress?.remaining_count ?? null,
      complete: progress?.complete ?? !nextStage,
      unitSingular: definition.unitSingular,
      unitPlural: definition.unitPlural,
    })
  }

  for (const badgeCode of earnedCodes) {
    if (ownedCodes.has(badgeCode) || getMemberBadgePresentation(badgeCode).group === 'roles') continue
    const presentation = getMemberBadgePresentation(badgeCode)
    const stage = familyStage({ badge_code: badgeCode, label: presentation.label, badge_category: 'special' }, `special:${badgeCode}`, 0, 0, earnedCodes)
    stage.stageKind = 'special'
    ownedCodes.add(badgeCode)
    families.push({
      key: 'special', group: 'special', label: presentation.label, stages: [stage], currentStage: stage,
      foundingStage: null,
      nextStage: null, heroStage: stage, currentCount: null, nextThreshold: null, remainingCount: null,
      complete: true, unitSingular: '', unitPlural: '',
    })
  }

  return families
}
