const VERSIONED_POINT_ARTWORK = new Set(['point_milestone_first', 'point_milestone_active', 'point_milestone_engaged', 'point_milestone_experienced', 'point_milestone_legend', 'point_milestone_veteran'])

const APPROVED_CONTRIBUTION_ARTWORK: Record<string, string> = {
  contribution_projects_bronze: 'contribution_projects_bronze-v3.png', contribution_projects_silver: 'contribution_projects_silver-v2.png', contribution_projects_gold: 'contribution_projects_gold-v2.png',
  contribution_chronicle_bronze: 'contribution_chronicle_bronze-v4.png', contribution_chronicle_silver: 'contribution_chronicle_silver-v2.png', contribution_chronicle_gold: 'contribution_chronicle_gold-v2.png',
  contribution_archivist_bronze: 'contribution_archivist_bronze-v2.png', contribution_archivist_silver: 'contribution_archivist_silver-v2.png', contribution_archivist_gold: 'contribution_archivist_gold-v2.png',
}
const APPROVED_MEMBERSHIP_ARTWORK: Record<string, string> = {
  founding_member: 'membership-founding_member-v4.png', long_term_member: 'membership-long_term_member-v4.png', membership_7_years: 'membership-7_years-v4.png', membership_10_years: 'membership-10_years-v4.png',
}
const APPROVED_SPECIAL_ARTWORK: Record<string, string> = { historical_leader: 'special-historical_leader-v1.png' }

export function resolveBadgeArtwork(badgeCode: string): string | undefined {
  if (badgeCode === 'first_contribution') return '/member-achievement-badges/progress-frame-first_contribution.png'
  if (badgeCode === 'point_milestone_veteran') return '/member-achievement-badges/point_milestone_veteran-v3.png'
  const productiveMatch = /^productive_(bronze|silver|gold)$/.exec(badgeCode)
  if (productiveMatch) return `/member-achievement-badges/progress-frame-productive-${productiveMatch[1]}.png`
  if (VERSIONED_POINT_ARTWORK.has(badgeCode)) return `/member-achievement-badges/${badgeCode}-v2.png`
  if (APPROVED_CONTRIBUTION_ARTWORK[badgeCode]) return `/member-achievement-badges/${APPROVED_CONTRIBUTION_ARTWORK[badgeCode]}`
  if (APPROVED_MEMBERSHIP_ARTWORK[badgeCode]) return `/member-achievement-badges/${APPROVED_MEMBERSHIP_ARTWORK[badgeCode]}`
  if (APPROVED_SPECIAL_ARTWORK[badgeCode]) return `/member-achievement-badges/${APPROVED_SPECIAL_ARTWORK[badgeCode]}`
  if (badgeCode.startsWith('contribution_') || badgeCode.startsWith('role_entry_')) return `/member-achievement-badges/${badgeCode}.png`
  const roleVolumeMatch = /^role_volume_(.+)_(?:bronze|silver|gold|platinum)$/.exec(badgeCode)
  if (roleVolumeMatch?.[1] === 'timer') return `/member-achievement-badges/${badgeCode}.png`
  return roleVolumeMatch ? `/member-achievement-badges/role_entry_${roleVolumeMatch[1]}.png` : undefined
}
