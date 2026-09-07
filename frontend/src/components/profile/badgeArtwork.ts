const VERSIONED_POINT_ARTWORK = new Set([
  'point_milestone_first',
  'point_milestone_active',
  'point_milestone_engaged',
  'point_milestone_experienced',
  'point_milestone_legend',
  'point_milestone_veteran',
])

const APPROVED_CONTRIBUTION_ARTWORK: Record<string, string> = {
  contribution_projects_bronze: 'contribution_projects_bronze-v3.png',
  contribution_projects_silver: 'contribution_projects_silver-v2.png',
  contribution_projects_gold: 'contribution_projects_gold-v2.png',
  contribution_chronicle_bronze: 'contribution_chronicle_bronze-v4.png',
  contribution_chronicle_silver: 'contribution_chronicle_silver-v2.png',
  contribution_chronicle_gold: 'contribution_chronicle_gold-v2.png',
  contribution_archivist_bronze: 'contribution_archivist_bronze-v2.png',
  contribution_archivist_silver: 'contribution_archivist_silver-v2.png',
  contribution_archivist_gold: 'contribution_archivist_gold-v2.png',
}
const APPROVED_MEMBERSHIP_ARTWORK: Record<string, string> = {
  founding_member: 'membership-founding_member-v4.png',
  long_term_member: 'membership-long_term_member-v4.png',
  membership_7_years: 'membership-7_years-v4.png',
  membership_10_years: 'membership-10_years-v4.png',
}
const APPROVED_SPECIAL_ARTWORK: Record<string, string> = {
  historical_leader: 'special-historical_leader-v1.png',
}
// Presentation only: the canonical role catalog owns which roles exist and the backend
// owns their badge thresholds. This manifest declares shipped artwork strategies only.
export type RoleArtworkStrategy = 'layered' | 'direct-volume'
const ROLE_ARTWORK_STRATEGIES = {
  admin: 'layered',
  designer: 'layered',
  editor: 'layered',
  encoder: 'layered',
  karaoke_fx: 'layered',
  other: 'layered',
  project_lead: 'layered',
  quality_checker: 'layered',
  raw_provider: 'layered',
  timer: 'direct-volume',
  translator: 'layered',
  typesetter: 'layered',
} as const satisfies Record<string, RoleArtworkStrategy>

// Any future deliberate absence must have a reason here and will be reported by coverage.
const ROLE_ARTWORK_EXCEPTIONS: Readonly<Record<string, string>> = {}
const ARTWORK_ROOT = '/member-achievement-badges/'
// Filename grammar, never thresholds or badge-generation rules.
const VOLUME_ARTWORK_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const
const ROLE_VOLUME_PATTERN = new RegExp(`^role_volume_(.+)_(${VOLUME_ARTWORK_TIERS.join('|')})$`)

export type LayeredRoleArtwork = { motifSrc: string; frameSrc: string }

export function roleArtworkStrategyFor(roleCode: string): RoleArtworkStrategy | undefined {
  return Object.hasOwn(ROLE_ARTWORK_STRATEGIES, roleCode)
    ? ROLE_ARTWORK_STRATEGIES[roleCode as keyof typeof ROLE_ARTWORK_STRATEGIES]
    : undefined
}

function parseRoleArtworkCode(badgeCode: string) {
  const volume = ROLE_VOLUME_PATTERN.exec(badgeCode)
  const entry = /^role_entry_(.+)$/.exec(badgeCode)
  const roleCode = volume?.[1] ?? entry?.[1]
  const strategy = roleCode ? roleArtworkStrategyFor(roleCode) : undefined
  return roleCode && strategy ? { roleCode, strategy, tier: volume?.[2] } : undefined
}

export function resolveBadgeArtwork(badgeCode: string, _roleIconKey?: string): string | undefined {
  void _roleIconKey // Retained caller argument; semantic icon keys do not select artwork.
  if (badgeCode === 'first_contribution')
    return `${ARTWORK_ROOT}progress-frame-first_contribution.png`
  if (badgeCode === 'point_milestone_veteran')
    return `${ARTWORK_ROOT}point_milestone_veteran-v3.png`
  const productive = /^productive_(bronze|silver|gold)$/.exec(badgeCode)
  if (productive) return `${ARTWORK_ROOT}progress-frame-productive-${productive[1]}.png`
  if (VERSIONED_POINT_ARTWORK.has(badgeCode)) return `${ARTWORK_ROOT}${badgeCode}-v2.png`
  for (const approved of [
    APPROVED_CONTRIBUTION_ARTWORK,
    APPROVED_MEMBERSHIP_ARTWORK,
    APPROVED_SPECIAL_ARTWORK,
  ]) {
    if (Object.hasOwn(approved, badgeCode)) return `${ARTWORK_ROOT}${approved[badgeCode]}`
  }
  const role = parseRoleArtworkCode(badgeCode)
  if (!role) return undefined
  if (role.tier && role.strategy === 'direct-volume') return `${ARTWORK_ROOT}${badgeCode}.png`
  return `${ARTWORK_ROOT}role_entry_${role.roleCode}.png`
}

export function resolveLayeredRoleArtwork(
  badgeCode: string,
  _roleIconKey?: string,
): LayeredRoleArtwork | undefined {
  void _roleIconKey // Retained for source compatibility with existing consumers.
  const role = parseRoleArtworkCode(badgeCode)
  if (!role?.tier || role.strategy !== 'layered') return undefined
  return {
    motifSrc: `${ARTWORK_ROOT}role-${role.roleCode}-motif.png`,
    frameSrc: `${ARTWORK_ROOT}rank-frame-${role.roleCode}-${role.tier}.png`,
  }
}

export type RoleArtworkCoverage = {
  missingRoles: string[]
  missingFiles: string[]
  exceptions: { roleCode: string; reason: string }[]
}

/** Pure coverage seam. Callers supply the canonical achievement-role catalog and real files. */
export function validateRoleArtworkCoverage(
  catalogRows: readonly { code: string }[],
  availablePublicPaths: ReadonlySet<string>,
): RoleArtworkCoverage {
  const missingRoles = new Set<string>()
  const missingFiles = new Set<string>()
  const exceptions: RoleArtworkCoverage['exceptions'] = []
  for (const roleCode of new Set(catalogRows.map((role) => role.code))) {
    if (Object.hasOwn(ROLE_ARTWORK_EXCEPTIONS, roleCode)) {
      exceptions.push({ roleCode, reason: ROLE_ARTWORK_EXCEPTIONS[roleCode] })
      continue
    }
    const strategy = roleArtworkStrategyFor(roleCode)
    if (!strategy) {
      missingRoles.add(roleCode)
      continue
    }
    const required = new Set<string>()
    const entry = resolveBadgeArtwork(`role_entry_${roleCode}`)
    if (entry) required.add(entry)
    else missingRoles.add(roleCode)
    for (const tier of VOLUME_ARTWORK_TIERS) {
      const code = `role_volume_${roleCode}_${tier}`
      const layered = resolveLayeredRoleArtwork(code)
      const direct = resolveBadgeArtwork(code)
      if (strategy === 'layered' && layered) {
        required.add(layered.motifSrc)
        required.add(layered.frameSrc)
      } else if (strategy === 'direct-volume' && direct) {
        required.add(direct)
      } else {
        missingRoles.add(roleCode)
      }
    }
    for (const file of required) if (!availablePublicPaths.has(file)) missingFiles.add(file)
  }
  return {
    missingRoles: [...missingRoles].sort(),
    missingFiles: [...missingFiles].sort(),
    exceptions,
  }
}
