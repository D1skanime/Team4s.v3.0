import {
  BadgeCheck,
  CalendarClock,
  Crown,
  Hexagon,
  Layers,
  Shield,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export type MemberBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export type MemberBadgePresentation = {
  label: string
  variant: MemberBadgeVariant
  Icon: LucideIcon
}

export type PublicMemberBadgeCatalogItem = {
  badge_code: string
  label: string
  badge_category: string
}

export const MEMBER_BADGE_PRESENTATIONS: Record<string, MemberBadgePresentation> = {
  founding_member: { label: 'Gründungsmitglied', variant: 'warning', Icon: Crown },
  historical_leader: { label: 'Historische Leitung', variant: 'info', Icon: Shield },
  long_term_member: { label: '5+ Jahre Mitglied', variant: 'success', Icon: CalendarClock },
  first_contribution: { label: 'Erste Mitwirkung', variant: 'neutral', Icon: Sparkles },
  productive_bronze: { label: 'Produktiv · 10+ Anime', variant: 'muted', Icon: Layers },
  productive_silver: { label: 'Produktiv · 25+ Anime', variant: 'neutral', Icon: Layers },
  productive_gold: { label: 'Produktiv · 50+ Anime', variant: 'warning', Icon: Layers },
  all_rounder: { label: 'Allrounder', variant: 'info', Icon: Hexagon },
  verified: { label: 'Verifiziert', variant: 'success', Icon: BadgeCheck },
}

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
    }
  )
}
