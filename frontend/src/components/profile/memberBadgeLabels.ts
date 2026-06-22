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

export const MEMBER_BADGE_PRESENTATIONS: Record<string, MemberBadgePresentation> = {
  founding_member: { label: 'Gründungsmitglied', variant: 'warning', Icon: Crown },
  historical_leader: { label: 'Historischer Leader', variant: 'info', Icon: Shield },
  long_term_member: { label: '5+ Jahre Mitglied', variant: 'success', Icon: CalendarClock },
  first_contribution: { label: 'Erste Mitwirkung', variant: 'neutral', Icon: Sparkles },
  productive_bronze: { label: 'Produktiv · 10+ Anime', variant: 'muted', Icon: Layers },
  productive_silver: { label: 'Produktiv · 25+ Anime', variant: 'neutral', Icon: Layers },
  productive_gold: { label: 'Produktiv · 50+ Anime', variant: 'warning', Icon: Layers },
  all_rounder: { label: 'Allrounder', variant: 'info', Icon: Hexagon },
  verified: { label: 'Verifiziert', variant: 'success', Icon: BadgeCheck },
}

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
