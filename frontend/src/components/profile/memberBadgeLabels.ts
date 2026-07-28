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
  Gem,
  HardDrive,
  Hexagon,
  Languages,
  Layers,
  Medal,
  Scissors,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Type,
  type LucideIcon,
} from 'lucide-react'

import type { PublicMemberBadge } from '@/types/profile'

export type MemberBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
export type MemberBadgePalette = 'gold' | 'indigo' | 'orange' | 'mint' | 'red'

// D-04: fester Satz beschrifteter Kategorie-Gruppen fuer die "Auszeichnungen"-Sektion.
// Jede neue Badge-Familie erhaelt hier einen weiteren Wert nach demselben Muster.
export type MemberBadgeGroup = 'roles' | 'progress' | 'membership' | 'special'

export type MemberBadgePresentation = {
  label: string
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
}

export const MEMBER_BADGE_PRESENTATIONS: Record<string, MemberBadgePresentation> = {
  founding_member: { label: 'Gründungsmitglied', variant: 'warning', Icon: Crown, palette: 'gold', group: 'membership' },
  historical_leader: { label: 'Historische Leitung', variant: 'info', Icon: Shield, palette: 'indigo', group: 'special' },
  long_term_member: { label: '5+ Jahre Mitglied', variant: 'success', Icon: CalendarClock, palette: 'orange', group: 'membership' },
  first_contribution: { label: 'Erste Mitwirkung', variant: 'neutral', Icon: Sparkles, palette: 'mint', group: 'progress' },
  productive_bronze: { label: 'Produktiv · 10+ Anime', variant: 'muted', Icon: Layers, palette: 'mint', group: 'progress' },
  productive_silver: { label: 'Produktiv · 25+ Anime', variant: 'neutral', Icon: Layers, palette: 'mint', group: 'progress' },
  productive_gold: { label: 'Produktiv · 50+ Anime', variant: 'warning', Icon: Star, palette: 'gold', group: 'progress' },
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
  // D-01/D-03: Punkt-Meilensteine — nur die statische Map, bewusst NICHT im PUBLIC_MEMBER_BADGE_CATALOG
  // (kein Locked-Zustand fuer Typ 2; der erreichte Meilenstein fliesst zur Laufzeit ueber den
  // earned-but-not-in-catalog-Fallback ein, siehe deriveMilestoneBadge).
  point_milestone_first: { label: 'Erster Beitrag', variant: 'muted', Icon: Flag, palette: 'mint', group: 'progress' },
  point_milestone_active: { label: 'Aktiver Mitwirkender', variant: 'neutral', Icon: Flame, palette: 'mint', group: 'progress' },
  point_milestone_experienced: { label: 'Erfahrener Mitwirkender', variant: 'success', Icon: Award, palette: 'orange', group: 'progress' },
  point_milestone_engaged: { label: 'Engagierter Mitwirkender', variant: 'success', Icon: Medal, palette: 'orange', group: 'progress' },
  point_milestone_veteran: { label: 'Veteran', variant: 'warning', Icon: Trophy, palette: 'gold', group: 'progress' },
  point_milestone_legend: { label: 'Archiv-Legende', variant: 'warning', Icon: Gem, palette: 'gold', group: 'progress' },
}

// D-04: deutsche Gruppen-Labels und feste Anzeigereihenfolge (Rollen zuerst, siehe 110-CONTEXT.md).
export const MEMBER_BADGE_GROUP_LABELS: Record<MemberBadgeGroup, string> = {
  roles: 'Rollen',
  progress: 'Fortschritt',
  membership: 'Mitgliedschaft',
  special: 'Besondere Auszeichnungen',
}

export const MEMBER_BADGE_GROUP_ORDER: MemberBadgeGroup[] = ['roles', 'progress', 'membership', 'special']

export const PUBLIC_MEMBER_BADGE_CATALOG: PublicMemberBadgeCatalogItem[] = [
  { badge_code: 'founding_member', label: MEMBER_BADGE_PRESENTATIONS.founding_member.label, badge_category: 'historical_achievement' },
  { badge_code: 'historical_leader', label: MEMBER_BADGE_PRESENTATIONS.historical_leader.label, badge_category: 'historical_achievement' },
  { badge_code: 'long_term_member', label: MEMBER_BADGE_PRESENTATIONS.long_term_member.label, badge_category: 'membership' },
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
]

export function formatMemberBadgeLabel(badgeCode: string): string {
  return MEMBER_BADGE_PRESENTATIONS[badgeCode]?.label ?? badgeCode
}

export function getMemberBadgePresentation(badgeCode: string): MemberBadgePresentation {
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
const POINT_MILESTONES: Array<{ threshold: number; badge_code: string }> = [
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
