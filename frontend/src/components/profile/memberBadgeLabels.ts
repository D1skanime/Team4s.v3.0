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

import { resolveRoleVolumePresentation } from './memberBadgeFamilies'

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
  // earned-but-not-in-catalog-Fallback ein -- seit Phase 150 gelesen aus profile.badge_progress's
  // "points"-Familie, siehe MemberProfileContent.tsx).
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
// Exportiert, weil memberBadgeFamilies.ts (resolveRoleVolumePresentation) sie ebenfalls
// braucht (Plan 150-05 Task 3 Datei-Split).
export const ROLE_VOLUME_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const
export type RoleVolumeTier = (typeof ROLE_VOLUME_TIERS)[number]

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
