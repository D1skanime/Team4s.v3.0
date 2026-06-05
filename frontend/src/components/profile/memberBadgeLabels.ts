export const MEMBER_BADGE_LABELS: Record<string, string> = {
  founding_member: '★ Gründungsmitglied',
  historical_leader: '♦ Historischer Leader',
  long_term_member: '◆ 5+ Jahre Mitglied',
  first_contribution: '✦ Erster Beitrag',
  productive_bronze: '◈ Produktiv · 10+ Anime',
  productive_silver: '◈ Produktiv · 25+ Anime',
  productive_gold: '◈ Produktiv · 50+ Anime',
  all_rounder: '⬡ Allrounder',
  verified: '✓ Verifiziert',
}

export function formatMemberBadgeLabel(badgeCode: string): string {
  return MEMBER_BADGE_LABELS[badgeCode] ?? badgeCode
}
