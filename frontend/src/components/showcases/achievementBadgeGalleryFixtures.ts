import { resolveProgressArtworkDescriptor } from '@/components/profile/AchievementStages'
import {
  resolveMemberBadgeFamilies,
  resolveRoleProgressPresentation,
  type MemberBadgeFamilyPresentation,
  type RoleProgressTier,
} from '@/components/profile/memberBadgeFamilies'
import {
  getMemberBadgePresentation,
  PUBLIC_MEMBER_BADGE_CATALOG,
  type PublicMemberBadgeCatalogItem,
} from '@/components/profile/memberBadgeLabels'
import type { RoleCatalogLoads } from '@/providers/RoleCatalogProvider'
import type { PublicRoleDefinitionOption } from '@/types/admin-capability'
import type {
  PublicMemberBadge,
  PublicMemberBadgeProgress,
} from '@/types/profile'

/**
 * Static, server-response-shaped visual data for the dev gallery. These values are
 * deliberately fixtures: production role/catalog and threshold authority remains on
 * the server and is covered by the real-catalog tests outside this showcase.
 */
export const GALLERY_ROLE_ROWS: PublicRoleDefinitionOption[] = [
  ['project_lead', 'Projektleitung', '#183b7c', 'crown'],
  ['translator', 'Übersetzung', '#27664f', 'languages'],
  ['timer', 'Timing', '#c26a2e', 'film'],
  ['typesetter', 'Typesetting', '#7b3c4e', 'wrench'],
  ['editor', 'Editing', '#506b91', 'wrench'],
  ['encoder', 'Encoding', '#0369a1', 'film'],
  ['raw_provider', 'Raw-Bereitstellung', '#a04444', 'image'],
  ['quality_checker', 'Qualitätsprüfung', '#6b7f2a', 'check'],
  ['designer', 'Design', '#b23a78', 'image'],
  ['admin', 'Administration', '#475569', 'wrench'],
  ['other', 'Andere', '#6d3f83', 'user'],
  ['karaoke_fx', 'Karaoke-FX', '#a16207', 'image'],
].map(([code, label_de, color_key, icon_key], sort_order) => ({
  code,
  label_de,
  contexts: ['anime_contribution'],
  sort_order,
  assignable: true,
  color_key,
  icon_key,
  operative_capability_count: 0,
  has_operative_capabilities: false,
}))

export const GALLERY_ROLE_CATALOG_LOADS: RoleCatalogLoads = {
  fansub_group: { rows: [], error: null },
  anime_contribution: { rows: GALLERY_ROLE_ROWS, error: null },
  group_history: { rows: [], error: null },
}

export const GALLERY_ROLE_STAGES = [
  { code: 'entry', threshold: 1 },
  { code: 'bronze', threshold: 12 },
  { code: 'silver', threshold: 108 },
  { code: 'gold', threshold: 320 },
  { code: 'platinum', threshold: 510 },
] as const

const COMPLETE_NON_ROLE_PROGRESS: PublicMemberBadgeProgress[] = [
  progressFixture('progress', 50, 'productive_gold', null, [
    ['first_contribution', 1],
    ['productive_bronze', 10],
    ['productive_silver', 25],
    ['productive_gold', 50],
  ]),
  progressFixture('points', 2500, 'point_milestone_legend', null, [
    ['point_milestone_first', 1],
    ['point_milestone_active', 50],
    ['point_milestone_experienced', 200],
    ['point_milestone_engaged', 500],
    ['point_milestone_veteran', 1000],
    ['point_milestone_legend', 2500],
  ]),
  progressFixture('contribution_projects', 15, 'gold', null, [
    ['bronze', 1], ['silver', 5], ['gold', 15],
  ]),
  progressFixture('contribution_chronicle', 150, 'gold', null, [
    ['bronze', 10], ['silver', 50], ['gold', 150],
  ]),
  progressFixture('contribution_archivist', 150, 'gold', null, [
    ['bronze', 10], ['silver', 50], ['gold', 150],
  ]),
  progressFixture('membership', 10, 'membership_10_years', null, [
    ['long_term_member', 5],
    ['membership_7_years', 7],
    ['membership_10_years', 10],
  ]),
]

export const GALLERY_PARTIAL_BADGE_PROGRESS: PublicMemberBadgeProgress[] = [
  progressFixture('progress', 25, 'productive_silver', 50, [
    ['first_contribution', 1],
    ['productive_bronze', 10],
    ['productive_silver', 25],
    ['productive_gold', 50],
  ]),
  progressFixture('points', 500, 'point_milestone_engaged', 1000, [
    ['point_milestone_first', 1],
    ['point_milestone_active', 50],
    ['point_milestone_experienced', 200],
    ['point_milestone_engaged', 500],
    ['point_milestone_veteran', 1000],
    ['point_milestone_legend', 2500],
  ]),
  progressFixture('contribution_projects', 5, 'silver', 15, [
    ['bronze', 1], ['silver', 5], ['gold', 15],
  ]),
  progressFixture('contribution_chronicle', 50, 'silver', 150, [
    ['bronze', 10], ['silver', 50], ['gold', 150],
  ]),
  progressFixture('contribution_archivist', 10, 'bronze', 50, [
    ['bronze', 10], ['silver', 50], ['gold', 150],
  ]),
  progressFixture('membership', 7, 'membership_7_years', 10, [
    ['long_term_member', 5],
    ['membership_7_years', 7],
    ['membership_10_years', 10],
  ]),
]

function progressFixture(
  family: string,
  currentCount: number,
  currentTier: string,
  nextThreshold: number | null,
  stages: Array<readonly [string, number]>,
): PublicMemberBadgeProgress {
  return {
    family,
    current_count: currentCount,
    current_tier: currentTier,
    next_threshold: nextThreshold,
    remaining_count: nextThreshold == null ? null : nextThreshold - currentCount,
    next_tier: nextThreshold == null
      ? null
      : stages.find(([, threshold]) => threshold === nextThreshold)?.[0] ?? null,
    complete: nextThreshold == null,
    stages: stages.map(([code, threshold]) => ({ code, threshold })),
  }
}

export function roleProgressFixture(roleCode: string, count: number) {
  return resolveRoleProgressPresentation({
    family: 'role_volume',
    role_code: roleCode,
    current_count: count,
    current_tier: '',
    next_threshold: null,
    remaining_count: null,
    next_tier: null,
    complete: count >= GALLERY_ROLE_STAGES.at(-1)!.threshold,
    stages: GALLERY_ROLE_STAGES.map(({ code, threshold }) => ({ code, threshold })),
  })
}

export function roleCatalogFixture(roleCode: string): PublicMemberBadgeCatalogItem[] {
  return GALLERY_ROLE_STAGES.map(({ code }) => {
    const badgeCode = code === 'entry'
      ? `role_entry_${roleCode}`
      : `role_volume_${roleCode}_${code}`
    return {
      badge_code: badgeCode,
      badge_category: code === 'entry' ? 'role_entry' : 'role_volume',
      label: getMemberBadgePresentation(badgeCode).label,
      stageKind: 'role',
    }
  })
}

const publicNonRoleCodes = PUBLIC_MEMBER_BADGE_CATALOG
  .filter((item) => getMemberBadgePresentation(item.badge_code).group !== 'roles')
  .map((item) => item.badge_code)

export const GALLERY_COMPLETE_FAMILIES = resolveMemberBadgeFamilies({
  earned_codes: publicNonRoleCodes,
  badge_progress: COMPLETE_NON_ROLE_PROGRESS,
})

function familyAtCurrentStage(
  family: MemberBadgeFamilyPresentation,
  badgeCode: string,
): MemberBadgeFamilyPresentation {
  const targetStage = family.stages.find((stage) => stage.badge_code === badgeCode)!
  const nextStage = family.stages[targetStage.order + 1] ?? null
  const baseProgress = COMPLETE_NON_ROLE_PROGRESS.find(
    (progress) => progress.family === family.key,
  )!
  const targetProgressStage = baseProgress.stages?.[targetStage.order]
  const nextProgressStage = nextStage
    ? baseProgress.stages?.[nextStage.order] ?? null
    : null
  const badgeProgress: PublicMemberBadgeProgress = {
    ...baseProgress,
    current_count: targetStage.threshold,
    current_tier: targetProgressStage?.code ?? '',
    next_threshold: nextStage?.threshold ?? null,
    remaining_count: nextStage ? nextStage.threshold - targetStage.threshold : null,
    next_tier: nextProgressStage?.code ?? null,
    complete: nextStage == null,
  }

  return resolveMemberBadgeFamilies({
    earned_codes: [],
    badge_progress: [badgeProgress],
  }).find((resolvedFamily) => resolvedFamily.key === family.key)!
}

export const GALLERY_NON_ROLE_FAMILIES = new Map(
  GALLERY_COMPLETE_FAMILIES
    .filter((family) => family.group !== 'special')
    .flatMap((family) =>
      family.stages.map((stage) => [
        stage.badge_code,
        familyAtCurrentStage(family, stage.badge_code),
      ] as const),
    ),
)

export const GALLERY_FOUNDING_MEMBERSHIP_FAMILY = GALLERY_COMPLETE_FAMILIES.find(
  (family) => family.key === 'membership',
)!

export const GALLERY_HISTORICAL_BADGES: PublicMemberBadge[] = [
  badgeFixture(1, 'historical_leader', 'historical_achievement'),
]

export const GALLERY_HISTORICAL_CATALOG = PUBLIC_MEMBER_BADGE_CATALOG.filter(
  (item) => item.badge_code === 'historical_leader',
)

export const GALLERY_PARTIAL_FAMILIES = resolveMemberBadgeFamilies({
  earned_codes: ['founding_member', 'historical_leader'],
  badge_progress: GALLERY_PARTIAL_BADGE_PROGRESS,
})

export const GALLERY_NON_ROLE_CASES = Array.from(
  new Map(
    GALLERY_COMPLETE_FAMILIES.flatMap((family) => [
      ...(family.foundingStage ? [family.foundingStage] : []),
      ...family.stages,
    ])
      .filter((item) => resolveProgressArtworkDescriptor(item.badge_code))
      .map((item) => [item.badge_code, item]),
  ).values(),
).sort((left, right) => left.badge_code.localeCompare(right.badge_code))

export const GALLERY_CHAIN_BADGES: PublicMemberBadge[] = [
  badgeFixture(1, 'founding_member', 'historical_achievement'),
  badgeFixture(2, 'historical_leader', 'historical_achievement'),
  badgeFixture(3, 'role_entry_translator', 'role_entry', 108, 'silver'),
  badgeFixture(4, 'role_entry_timer', 'role_entry', 1, 'entry'),
]

export const GALLERY_CHAIN_PROGRESS: PublicMemberBadgeProgress[] = [
  ...GALLERY_PARTIAL_BADGE_PROGRESS,
  roleVolumeProgressFixture('translator', 108),
  roleVolumeProgressFixture('timer', 1),
]

function badgeFixture(
  id: number,
  badgeCode: string,
  badgeCategory: string,
  currentCount?: number,
  currentTier?: RoleProgressTier,
): PublicMemberBadge {
  return {
    id,
    badge_code: badgeCode,
    badge_category: badgeCategory,
    current_count: currentCount,
    current_tier: currentTier,
  }
}

function roleVolumeProgressFixture(
  roleCode: string,
  count: number,
): PublicMemberBadgeProgress {
  const progress = roleProgressFixture(roleCode, count)
  return {
    family: 'role_volume',
    role_code: roleCode,
    current_count: count,
    current_tier: progress.tier ?? '',
    next_threshold: progress.nextThreshold,
    remaining_count: progress.nextThreshold == null
      ? null
      : progress.nextThreshold - count,
    next_tier: progress.nextTierLabel,
    complete: progress.nextThreshold == null,
    stages: GALLERY_ROLE_STAGES.map(({ code, threshold }) => ({ code, threshold })),
  }
}

export function familyStageComponentKey(
  family: MemberBadgeFamilyPresentation,
): 'progress' | 'points' | 'membership' | 'contribution' {
  if (family.key === 'progress' || family.key === 'points' || family.key === 'membership') {
    return family.key
  }
  return 'contribution'
}
