import {
  Award,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Clock3,
  Cpu,
  Crown,
  Flag,
  Flame,
  FolderCheck,
  Gem,
  HardDrive,
  Hexagon,
  Images,
  Languages,
  Layers,
  Medal,
  Palette,
  Puzzle,
  Scissors,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Type,
  type LucideIcon,
} from 'lucide-react'

import type { PublicMemberBadge, PublicMemberBadgeProgress } from '@/types/profile'

export type MemberBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
export type MemberBadgePalette = 'gold' | 'indigo' | 'orange' | 'mint' | 'red' | 'bronze' | 'silver' | 'platinum'

// D-04: fester Satz beschrifteter Kategorie-Gruppen fuer die "Auszeichnungen"-Sektion.
// Jede neue Badge-Familie erhaelt hier einen weiteren Wert nach demselben Muster.
export type MemberBadgeGroup = 'roles' | 'progress' | 'points' | 'contributions' | 'membership' | 'special'

export type MemberBadgePresentation = {
  label: string
  detailLabel?: string
  variant: MemberBadgeVariant
  Icon: LucideIcon
  palette: MemberBadgePalette
  group: MemberBadgeGroup
  // Nur fuer die Rollen-Gruppe gesetzt: Badges mit demselben roleCode werden zu einer
  // Zeile zusammengefuehrt (generischer Same-roleCode-Merge, Phase 112 Typ 3 dockt hier an).
  roleCode?: string
}

export type PublicMemberBadgeCatalogItem = {
  badge_code: string
  label: string
  badge_category: string
  family?: string
  threshold?: number
  order?: number
  stageKind?: 'progress' | 'special' | 'role'
}

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

export const MEMBER_BADGE_PRESENTATIONS: Record<string, MemberBadgePresentation> = {
  founding_member: { label: 'Gründungsmitglied', variant: 'warning', Icon: Crown, palette: 'gold', group: 'membership' },
  historical_leader: { label: 'Historische Leitung', variant: 'info', Icon: Shield, palette: 'indigo', group: 'special' },
  long_term_member: { label: '5+ Jahre Mitglied', variant: 'success', Icon: CalendarClock, palette: 'orange', group: 'membership' },
  membership_7_years: { label: '7+ Jahre Mitglied', variant: 'success', Icon: CalendarClock, palette: 'orange', group: 'membership' },
  membership_10_years: { label: '10+ Jahre Mitglied', variant: 'info', Icon: CalendarClock, palette: 'indigo', group: 'membership' },
  first_contribution: { label: 'Erste Mitwirkung', variant: 'neutral', Icon: Sparkles, palette: 'mint', group: 'progress' },
  productive_bronze: { label: 'Projekt-Engagement · Bronze', detailLabel: '10 Anime-Projekte', variant: 'muted', Icon: Layers, palette: 'mint', group: 'progress' },
  productive_silver: { label: 'Projekterfahrung · Silber', detailLabel: '25 Anime-Projekte', variant: 'neutral', Icon: Layers, palette: 'mint', group: 'progress' },
  productive_gold: { label: 'Projekt-Veteranenstatus · Gold', detailLabel: '50 Anime-Projekte', variant: 'warning', Icon: Star, palette: 'gold', group: 'progress' },
  all_rounder: { label: 'Allrounder', variant: 'info', Icon: Hexagon, palette: 'red', group: 'special' },
  verified: { label: 'Verifiziert', variant: 'success', Icon: BadgeCheck, palette: 'red', group: 'special' },
  role_entry_translator: { label: 'Erste Übersetzung', variant: 'info', Icon: Languages, palette: 'indigo', group: 'roles', roleCode: 'translator' },
  role_entry_timer: { label: 'Erstes Timing', variant: 'info', Icon: Clock3, palette: 'indigo', group: 'roles', roleCode: 'timer' },
  role_entry_encoder: { label: 'Erster Encode', variant: 'info', Icon: Cpu, palette: 'indigo', group: 'roles', roleCode: 'encoder' },
  role_entry_typesetter: { label: 'Erstes Typesetting', variant: 'info', Icon: Type, palette: 'indigo', group: 'roles', roleCode: 'typesetter' },
  role_entry_quality_checker: { label: 'Erste Qualitätsprüfung', variant: 'info', Icon: ShieldCheck, palette: 'indigo', group: 'roles', roleCode: 'quality_checker' },
  role_entry_project_lead: { label: 'Erste Dokumentation als Projektleitung', variant: 'info', Icon: ClipboardList, palette: 'indigo', group: 'roles', roleCode: 'project_lead' },
  role_entry_editor: { label: 'Erstes Editing', variant: 'info', Icon: Scissors, palette: 'indigo', group: 'roles', roleCode: 'editor' },
  role_entry_raw_provider: { label: 'Erste Raw-Bereitstellung', variant: 'info', Icon: HardDrive, palette: 'indigo', group: 'roles', roleCode: 'raw_provider' },
  // CR-01 (112-REVIEW): role_entry_* fuer die restlichen anime_contribution-Rollencodes
  // aus role_definitions (0085/0112), die bislang gefehlt haben. 'project_manager' ist
  // NICHT enthalten — Migration 0112 hat den Code aus role_definitions geloescht und
  // historische Eintraege auf 'project_lead' migriert; RoleCodeExistsForContext (live
  // role_definitions-Query) laesst ihn seither als anime_contribution-Rollencode nicht
  // mehr zu, daher ist er fuer neue role_entry_*-Badges kein erreichbarer Fall mehr.
  role_entry_designer: { label: 'Erstes Design', variant: 'info', Icon: Palette, palette: 'indigo', group: 'roles', roleCode: 'designer' },
  role_entry_admin: { label: 'Erste Administration', variant: 'info', Icon: Settings, palette: 'indigo', group: 'roles', roleCode: 'admin' },
  role_entry_other: { label: 'Erste sonstige Mitwirkung', variant: 'info', Icon: Puzzle, palette: 'indigo', group: 'roles', roleCode: 'other' },
  // D-01/D-03: Punkt-Meilensteine — nur die statische Map, bewusst NICHT im PUBLIC_MEMBER_BADGE_CATALOG
  // (kein Locked-Zustand fuer Typ 2; der erreichte Meilenstein fliesst zur Laufzeit ueber den
  // earned-but-not-in-catalog-Fallback ein, siehe deriveMilestoneBadge).
  point_milestone_first: { label: 'Erste Punkte', detailLabel: '1 Punkt', variant: 'muted', Icon: Flag, palette: 'mint', group: 'points' },
  point_milestone_active: { label: 'Aktiv dabei', detailLabel: '50 Punkte', variant: 'neutral', Icon: Flame, palette: 'mint', group: 'points' },
  point_milestone_experienced: { label: 'Erfahrungsstufe', detailLabel: '200 Punkte', variant: 'success', Icon: Award, palette: 'orange', group: 'points' },
  point_milestone_engaged: { label: 'Stark engagiert', detailLabel: '500 Punkte', variant: 'success', Icon: Medal, palette: 'orange', group: 'points' },
  point_milestone_veteran: { label: 'Veteranenstatus', detailLabel: '1000 Punkte', variant: 'warning', Icon: Trophy, palette: 'gold', group: 'points' },
  point_milestone_legend: { label: 'Archiv-Legende', detailLabel: '2500 Punkte', variant: 'warning', Icon: Gem, palette: 'gold', group: 'points' },
  contribution_projects_bronze: { label: 'Mitgetragene Projekte · Bronze', variant: 'muted', Icon: FolderCheck, palette: 'bronze', group: 'contributions' },
  contribution_projects_silver: { label: 'Mitgetragene Projekte · Silber', variant: 'neutral', Icon: FolderCheck, palette: 'silver', group: 'contributions' },
  contribution_projects_gold: { label: 'Mitgetragene Projekte · Gold', variant: 'warning', Icon: FolderCheck, palette: 'gold', group: 'contributions' },
  contribution_chronicle_bronze: { label: 'Chronikpflege · Bronze', variant: 'muted', Icon: ScrollText, palette: 'bronze', group: 'contributions' },
  contribution_chronicle_silver: { label: 'Chronikpflege · Silber', variant: 'neutral', Icon: ScrollText, palette: 'silver', group: 'contributions' },
  contribution_chronicle_gold: { label: 'Chronikpflege · Gold', variant: 'warning', Icon: ScrollText, palette: 'gold', group: 'contributions' },
  contribution_archivist_bronze: { label: 'Bildarchivpflege · Bronze', variant: 'muted', Icon: Images, palette: 'bronze', group: 'contributions' },
  contribution_archivist_silver: { label: 'Bildarchivpflege · Silber', variant: 'neutral', Icon: Images, palette: 'silver', group: 'contributions' },
  contribution_archivist_gold: { label: 'Bildarchivpflege · Gold', variant: 'warning', Icon: Images, palette: 'gold', group: 'contributions' },
}

// D-04: deutsche Gruppen-Labels und feste Anzeigereihenfolge (Rollen zuerst, siehe 110-CONTEXT.md).
export const MEMBER_BADGE_GROUP_LABELS: Record<MemberBadgeGroup, string> = {
  roles: 'Fansubrollen',
  progress: 'Fortschritt',
  points: 'Punkte-Meilensteine',
  contributions: 'Beiträge',
  membership: 'Mitgliedschaft',
  special: 'Besondere Auszeichnungen',
}

export const MEMBER_BADGE_GROUP_ORDER: MemberBadgeGroup[] = ['roles', 'progress', 'points', 'contributions', 'membership', 'special']

export const PUBLIC_MEMBER_BADGE_CATALOG: PublicMemberBadgeCatalogItem[] = [
  { badge_code: 'founding_member', label: MEMBER_BADGE_PRESENTATIONS.founding_member.label, badge_category: 'historical_achievement' },
  { badge_code: 'historical_leader', label: MEMBER_BADGE_PRESENTATIONS.historical_leader.label, badge_category: 'historical_achievement' },
  { badge_code: 'long_term_member', label: MEMBER_BADGE_PRESENTATIONS.long_term_member.label, badge_category: 'membership' },
  { badge_code: 'membership_7_years', label: MEMBER_BADGE_PRESENTATIONS.membership_7_years.label, badge_category: 'membership' },
  { badge_code: 'membership_10_years', label: MEMBER_BADGE_PRESENTATIONS.membership_10_years.label, badge_category: 'membership' },
  { badge_code: 'first_contribution', label: MEMBER_BADGE_PRESENTATIONS.first_contribution.label, badge_category: 'contribution' },
  { badge_code: 'productive_bronze', label: MEMBER_BADGE_PRESENTATIONS.productive_bronze.label, badge_category: 'quantity' },
  { badge_code: 'productive_silver', label: MEMBER_BADGE_PRESENTATIONS.productive_silver.label, badge_category: 'quantity' },
  { badge_code: 'productive_gold', label: MEMBER_BADGE_PRESENTATIONS.productive_gold.label, badge_category: 'quantity' },
  { badge_code: 'all_rounder', label: MEMBER_BADGE_PRESENTATIONS.all_rounder.label, badge_category: 'contribution' },
  { badge_code: 'verified', label: MEMBER_BADGE_PRESENTATIONS.verified.label, badge_category: 'account' },
  { badge_code: 'role_entry_translator', label: MEMBER_BADGE_PRESENTATIONS.role_entry_translator.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_timer', label: MEMBER_BADGE_PRESENTATIONS.role_entry_timer.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_encoder', label: MEMBER_BADGE_PRESENTATIONS.role_entry_encoder.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_typesetter', label: MEMBER_BADGE_PRESENTATIONS.role_entry_typesetter.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_quality_checker', label: MEMBER_BADGE_PRESENTATIONS.role_entry_quality_checker.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_project_lead', label: MEMBER_BADGE_PRESENTATIONS.role_entry_project_lead.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_editor', label: MEMBER_BADGE_PRESENTATIONS.role_entry_editor.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_raw_provider', label: MEMBER_BADGE_PRESENTATIONS.role_entry_raw_provider.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_designer', label: MEMBER_BADGE_PRESENTATIONS.role_entry_designer.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_admin', label: MEMBER_BADGE_PRESENTATIONS.role_entry_admin.label, badge_category: 'role_entry' },
  { badge_code: 'role_entry_other', label: MEMBER_BADGE_PRESENTATIONS.role_entry_other.label, badge_category: 'role_entry' },
]

export function formatMemberBadgeLabel(badgeCode: string): string {
  return MEMBER_BADGE_PRESENTATIONS[badgeCode]?.label ?? badgeCode
}

// D-04: Tier-Suffixe fuer role_volume_<roleCode>_<tier>-Codes. Bekannte Suffixe werden vom
// Ende abgeschnitten (nicht per naivem split('_')), damit Rollencodes mit eigenen
// Unterstrichen (quality_checker, raw_provider, project_lead) korrekt erhalten bleiben.
const ROLE_VOLUME_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const
export type RoleVolumeTier = (typeof ROLE_VOLUME_TIERS)[number]

const ROLE_VOLUME_TIER_LABELS: Record<RoleVolumeTier, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin',
}

// Phase 116 (D-04): export only, keine Wertänderung — Single Source of Truth für
// CategoryProgressTable.tsx (Plan 116-05), damit dort keine neuen Schwellenwerte entstehen.
export const ROLE_VOLUME_TIER_THRESHOLDS: Record<RoleVolumeTier, number> = {
  bronze: 12,
  silver: 108,
  gold: 320,
  platinum: 510,
}

const ROLE_VOLUME_TIER_VARIANTS: Record<RoleVolumeTier, MemberBadgeVariant> = {
  bronze: 'muted',
  silver: 'neutral',
  gold: 'warning',
  platinum: 'info',
}

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
    label: `${ROLE_VOLUME_TIER_LABELS[tier]} · ${ROLE_VOLUME_TIER_THRESHOLDS[tier]}+`,
    variant: ROLE_VOLUME_TIER_VARIANTS[tier],
    Icon: ROLE_VOLUME_TIER_ICONS[tier],
    palette: tier,
    group: 'roles',
    roleCode,
  }
}

export function getMemberBadgePresentation(badgeCode: string): MemberBadgePresentation {
  if (badgeCode.startsWith('role_volume_')) {
    return resolveRoleVolumePresentation(badgeCode)
  }
  if (badgeCode.startsWith('role_entry_') && !MEMBER_BADGE_PRESENTATIONS[badgeCode]) {
    return {
      label: 'Erste Mitwirkung',
      variant: 'info',
      Icon: Sparkles,
      palette: 'indigo',
      group: 'roles',
      roleCode: badgeCode.slice('role_entry_'.length),
    }
  }
  return (
    MEMBER_BADGE_PRESENTATIONS[badgeCode] ?? {
      label: badgeCode,
      variant: 'neutral',
      Icon: Sparkles,
      palette: 'mint',
      group: 'special',
    }
  )
}

// D-01: die 6 Punktschwellen sind selbst die Meilenstein-Stufen, absteigend sortiert fuer
// die "hoechste erreichte Stufe"-Ableitung (identischer Vergleichsstil wie der Go-Pendant
// highestRoleVolumeTier, siehe RESEARCH Don't-Hand-Roll).
// Phase 116 (D-04): export only, keine Wertänderung — Single Source of Truth für
// CategoryProgressTable.tsx (Plan 116-05), damit dort keine neuen Schwellenwerte entstehen.
export const POINT_MILESTONES: Array<{ threshold: number; badge_code: string }> = [
  { threshold: 2500, badge_code: 'point_milestone_legend' },
  { threshold: 1000, badge_code: 'point_milestone_veteran' },
  { threshold: 500, badge_code: 'point_milestone_engaged' },
  { threshold: 200, badge_code: 'point_milestone_experienced' },
  { threshold: 50, badge_code: 'point_milestone_active' },
  { threshold: 1, badge_code: 'point_milestone_first' },
]

// D-01/D-03: liefert NUR den hoechsten erreichten Meilenstein (Einzahl) und null unter 1
// Punkt — keine Kette. Reine Read-time-Projektion ohne Persistenz/Punktvergabe (GAM-04).
export function deriveMilestoneBadge(totalPoints: number): PublicMemberBadge | null {
  const hit = POINT_MILESTONES.find((m) => totalPoints >= m.threshold)
  return hit ? { id: 0, badge_code: hit.badge_code, badge_category: 'progress' } : null
}

/**
 * Phase 116 (D-04): liefert den aktuell gehaltenen Punkt-Meilenstein (via deriveMilestoneBadge,
 * unverändert wiederverwendet) plus die nächsthöhere Schwelle. Existiert speziell, damit
 * CategoryProgressTable.tsx (Plan 116-05) POINT_MILESTONES nie erneut sortiert oder dupliziert.
 */
export function resolveNextPointMilestone(
  totalPoints: number,
): { currentBadge: PublicMemberBadge | null; nextThreshold: number | null } {
  const ascending = [...POINT_MILESTONES].sort((a, b) => a.threshold - b.threshold)
  const next = ascending.find((milestone) => milestone.threshold > totalPoints)

  return {
    currentBadge: deriveMilestoneBadge(totalPoints),
    nextThreshold: next ? next.threshold : null,
  }
}

/**
 * Phase 116 (D-04): liefert die aktuell gehaltene Rollen-Volumen-Stufe (leerer String unterhalb
 * von Bronze) plus die nächsthöhere Schwelle/deutsches Label. Existiert speziell, damit
 * CategoryProgressTable.tsx (Plan 116-05) ROLE_VOLUME_TIER_THRESHOLDS nie erneut dupliziert.
 */
export function resolveNextRoleVolumeThreshold(
  count: number,
): { currentTier: RoleVolumeTier | ''; nextThreshold: number | null; nextTierLabel: string | null } {
  let currentTier: RoleVolumeTier | '' = ''
  for (const tier of ROLE_VOLUME_TIERS) {
    if (count >= ROLE_VOLUME_TIER_THRESHOLDS[tier]) {
      currentTier = tier
    }
  }

  const currentIndex = currentTier === '' ? -1 : ROLE_VOLUME_TIERS.indexOf(currentTier)
  const nextTier = ROLE_VOLUME_TIERS[currentIndex + 1]

  return {
    currentTier,
    nextThreshold: nextTier ? ROLE_VOLUME_TIER_THRESHOLDS[nextTier] : null,
    nextTierLabel: nextTier ? ROLE_VOLUME_TIER_LABELS[nextTier] : null,
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

const ROLE_PROGRESS_STAGES: Array<{ tier: RoleProgressTier; threshold: number; label: string }> = [
  { tier: 'entry', threshold: 1, label: 'Einstieg' },
  ...ROLE_VOLUME_TIERS.map((tier) => ({
    tier,
    threshold: ROLE_VOLUME_TIER_THRESHOLDS[tier],
    label: ROLE_VOLUME_TIER_LABELS[tier],
  })),
]

export function resolveRoleProgressPresentation(count: number): RoleProgressPresentation {
  const safeCount = Math.max(0, count)
  const current = [...ROLE_PROGRESS_STAGES].reverse().find((stage) => safeCount >= stage.threshold)
  const currentIndex = current ? ROLE_PROGRESS_STAGES.indexOf(current) : -1
  const next = safeCount === 0
    ? ROLE_PROGRESS_STAGES[1]
    : ROLE_PROGRESS_STAGES[currentIndex + 1] ?? null
  const progressMax = next?.threshold ?? ROLE_VOLUME_TIER_THRESHOLDS.platinum
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
    stages: ROLE_PROGRESS_STAGES.map((stage, index) => ({
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

const FAMILY_DEFINITIONS: Record<(typeof FAMILY_ORDER)[number], {
  group: MemberBadgeFamilyPresentation['group']
  label: string
  unitSingular: string
  unitPlural: string
  stages: Array<{ badge_code: string; threshold: number }>
}> = {
  progress: {
    group: 'progress', label: 'Anime-Projekte', unitSingular: 'Anime-Projekt', unitPlural: 'Anime-Projekte',
    stages: [
      { badge_code: 'first_contribution', threshold: 1 },
      { badge_code: 'productive_bronze', threshold: 10 },
      { badge_code: 'productive_silver', threshold: 25 },
      { badge_code: 'productive_gold', threshold: 50 },
    ],
  },
  points: {
    group: 'points', label: 'Punkte-Meilensteine', unitSingular: 'Punkt', unitPlural: 'Punkte',
    stages: [...POINT_MILESTONES]
      .sort((a, b) => a.threshold - b.threshold)
      .map(({ badge_code, threshold }) => ({ badge_code, threshold })),
  },
  contribution_projects: {
    group: 'contributions', label: 'Mitgetragene Projekte', unitSingular: 'mitgetragenes Projekt', unitPlural: 'mitgetragene Projekte',
    stages: ['bronze', 'silver', 'gold'].map((tier, index) => ({ badge_code: `contribution_projects_${tier}`, threshold: [1, 5, 15][index] })),
  },
  contribution_chronicle: {
    group: 'contributions', label: 'Chronikpflege', unitSingular: 'Chronikbeitrag', unitPlural: 'Chronikbeiträge',
    stages: ['bronze', 'silver', 'gold'].map((tier, index) => ({ badge_code: `contribution_chronicle_${tier}`, threshold: [10, 50, 150][index] })),
  },
  contribution_archivist: {
    group: 'contributions', label: 'Bildarchivpflege', unitSingular: 'Medienbeitrag', unitPlural: 'Medienbeiträge',
    stages: ['bronze', 'silver', 'gold'].map((tier, index) => ({ badge_code: `contribution_archivist_${tier}`, threshold: [10, 50, 150][index] })),
  },
  membership: {
    group: 'membership', label: 'Mitgliedschaft', unitSingular: 'Jahr Mitgliedschaft', unitPlural: 'Jahre Mitgliedschaft',
    stages: [
      { badge_code: 'long_term_member', threshold: 5 },
      { badge_code: 'membership_7_years', threshold: 7 },
      { badge_code: 'membership_10_years', threshold: 10 },
    ],
  },
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
      : definition.stages.map((stage) => ({
          ...stage,
          label: getMemberBadgePresentation(stage.badge_code).label,
          badge_category: definition.group,
        }))
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
