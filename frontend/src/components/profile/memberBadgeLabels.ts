import {
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Clock3,
  Cpu,
  Crown,
  HardDrive,
  Hexagon,
  Languages,
  Layers,
  Scissors,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Type,
  type LucideIcon,
} from 'lucide-react'

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
