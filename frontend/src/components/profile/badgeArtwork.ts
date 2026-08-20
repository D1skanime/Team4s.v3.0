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
const USER_ICON_ROLE_ARTWORK: Record<string, string> = {
  role_entry_admin: 'role_entry_admin.png',
  role_entry_designer: 'role_entry_designer.png',
  role_entry_editor: 'role_entry_editor.png',
  role_entry_encoder: 'role_entry_encoder.png',
  role_entry_other: 'role_entry_other.png',
  role_entry_project_lead: 'role_entry_project_lead.png',
  role_entry_quality_checker: 'role_entry_quality_checker.png',
  role_entry_raw_provider: 'role_entry_raw_provider.png',
  role_entry_timer: 'role_entry_timer.png',
  role_entry_translator: 'role_entry_translator.png',
  role_entry_typesetter: 'role_entry_typesetter.png',
}

// The catalog decides whether a role exists. This bounded registry only decides whether
// a trusted semantic icon key has a matching, shipped raster asset.
const ROLE_ARTWORK_BY_ICON_KEY: Record<string, Record<string, string>> = {
  user: USER_ICON_ROLE_ARTWORK,
}

export type LayeredRoleArtwork = { motifSrc: string; frameSrc: string }

function roleEntryCode(badgeCode: string): string | undefined {
  const entryMatch = /^(role_entry_.+)$/.exec(badgeCode)
  if (entryMatch) return entryMatch[1]
  const volumeMatch = /^role_volume_(.+)_(bronze|silver|gold|platinum)$/.exec(badgeCode)
  return volumeMatch ? `role_entry_${volumeMatch[1]}` : undefined
}

export function resolveBadgeArtwork(badgeCode: string, roleIconKey?: string): string | undefined {
  if (badgeCode === 'first_contribution') return '/member-achievement-badges/progress-frame-first_contribution.png'
  if (badgeCode === 'point_milestone_veteran') return '/member-achievement-badges/point_milestone_veteran-v3.png'
  const productiveMatch = /^productive_(bronze|silver|gold)$/.exec(badgeCode)
  if (productiveMatch) return `/member-achievement-badges/progress-frame-productive-${productiveMatch[1]}.png`
  if (VERSIONED_POINT_ARTWORK.has(badgeCode)) return `/member-achievement-badges/${badgeCode}-v2.png`
  if (APPROVED_CONTRIBUTION_ARTWORK[badgeCode]) return `/member-achievement-badges/${APPROVED_CONTRIBUTION_ARTWORK[badgeCode]}`
  if (APPROVED_MEMBERSHIP_ARTWORK[badgeCode]) return `/member-achievement-badges/${APPROVED_MEMBERSHIP_ARTWORK[badgeCode]}`
  if (APPROVED_SPECIAL_ARTWORK[badgeCode]) return `/member-achievement-badges/${APPROVED_SPECIAL_ARTWORK[badgeCode]}`
  if (badgeCode.startsWith('contribution_')) return `/member-achievement-badges/${badgeCode}.png`
  if (!roleIconKey) return undefined
  const entryCode = roleEntryCode(badgeCode)
  const assetFile = entryCode ? ROLE_ARTWORK_BY_ICON_KEY[roleIconKey]?.[entryCode] : undefined
  if (!assetFile) return undefined
  if (badgeCode.startsWith('role_volume_timer_')) return `/member-achievement-badges/${badgeCode}.png`
  return `/member-achievement-badges/${assetFile}`
}

export function resolveLayeredRoleArtwork(badgeCode: string, roleIconKey?: string): LayeredRoleArtwork | undefined {
  if (!roleIconKey || badgeCode.startsWith('role_volume_timer_')) return undefined
  const match = /^role_volume_(.+)_(bronze|silver|gold|platinum)$/.exec(badgeCode)
  if (!match || !ROLE_ARTWORK_BY_ICON_KEY[roleIconKey]?.[`role_entry_${match[1]}`]) return undefined
  return {
    motifSrc: `/member-achievement-badges/role-${match[1]}-motif.png`,
    frameSrc: `/member-achievement-badges/rank-frame-${match[1]}-${match[2]}.png`,
  }
}
