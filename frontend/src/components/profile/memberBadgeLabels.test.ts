import { describe, expect, it } from 'vitest'
import { FolderCheck, Images, ScrollText } from 'lucide-react'

// deriveMilestoneBadge existiert noch nicht in memberBadgeLabels.ts — macht diesen Test
// legitim RED (Task 1, Typ-2-Grenzwerte D-01/D-03).
import {
  deriveMilestoneBadge,
  getMemberBadgePresentation,
  MEMBER_BADGE_GROUP_LABELS,
  MEMBER_BADGE_GROUP_ORDER,
  MEMBER_BADGE_PRESENTATIONS,
  PUBLIC_MEMBER_BADGE_CATALOG,
  resolveNextPointMilestone,
  resolveNextRoleVolumeThreshold,
  resolveRoleProgressPresentation,
  ROLE_VOLUME_TIER_THRESHOLDS,
} from './memberBadgeLabels'

describe('Contribution-Badge-Präsentationen (D-05)', () => {
  const families = [
    { family: 'projects', label: 'Mitgetragene Projekte', Icon: FolderCheck },
    { family: 'chronicle', label: 'Chronikpflege', Icon: ScrollText },
    { family: 'archivist', label: 'Bildarchivpflege', Icon: Images },
  ] as const
  const tiers = [
    { tier: 'bronze', label: 'Bronze', variant: 'muted' },
    { tier: 'silver', label: 'Silber', variant: 'neutral' },
    { tier: 'gold', label: 'Gold', variant: 'warning' },
  ] as const

  it('ordnet alle neun Codes mit Label, Familien-Icon und Tier-Palette der Gruppe Beiträge zu', () => {
    for (const family of families) {
      for (const tier of tiers) {
        const code = `contribution_${family.family}_${tier.tier}`
        const presentation = MEMBER_BADGE_PRESENTATIONS[code]

        expect(presentation).toMatchObject({
          label: `${family.label} · ${tier.label}`,
          Icon: family.Icon,
          palette: tier.tier,
          variant: tier.variant,
          group: 'contributions',
        })
        expect(presentation.roleCode).toBeUndefined()
      }
    }
  })

  it('platziert Beiträge zwischen Fortschritt und Mitgliedschaft', () => {
    expect(MEMBER_BADGE_GROUP_LABELS.contributions).toBe('Beiträge')
    expect(MEMBER_BADGE_GROUP_ORDER).toEqual([
      'roles',
      'progress',
      'points',
      'contributions',
      'membership',
      'special',
    ])
  })

  it('hält alle neun Codes aus dem Public-Katalog heraus (earned-only)', () => {
    const catalogCodes = new Set(PUBLIC_MEMBER_BADGE_CATALOG.map((item) => item.badge_code))

    for (const family of families) {
      for (const tier of tiers) {
        expect(catalogCodes.has(`contribution_${family.family}_${tier.tier}`)).toBe(false)
      }
    }
  })
})

describe('deriveMilestoneBadge (D-01/D-03 — reine Read-time-Ableitung aus total_points)', () => {
  it('gibt null unter 1 Punkt zurück', () => {
    expect(deriveMilestoneBadge(0)).toBeNull()
  })

  it('liefert point_milestone_first bei 1 Punkt', () => {
    expect(deriveMilestoneBadge(1)?.badge_code).toBe('point_milestone_first')
  })

  it('bleibt bei 49 Punkten auf point_milestone_first', () => {
    expect(deriveMilestoneBadge(49)?.badge_code).toBe('point_milestone_first')
  })

  it('springt bei 50 Punkten auf point_milestone_active', () => {
    expect(deriveMilestoneBadge(50)?.badge_code).toBe('point_milestone_active')
  })

  it('bleibt bei 199 Punkten auf point_milestone_active', () => {
    expect(deriveMilestoneBadge(199)?.badge_code).toBe('point_milestone_active')
  })

  it('springt bei 200 Punkten eindeutig auf point_milestone_experienced (D-01)', () => {
    expect(deriveMilestoneBadge(200)?.badge_code).toBe('point_milestone_experienced')
  })

  it('liefert point_milestone_legend bei 2500 Punkten', () => {
    expect(deriveMilestoneBadge(2500)?.badge_code).toBe('point_milestone_legend')
  })

  it('bleibt bei 2501 Punkten auf point_milestone_legend (kein siebtes Level)', () => {
    expect(deriveMilestoneBadge(2501)?.badge_code).toBe('point_milestone_legend')
  })

  it('liefert die feste PublicMemberBadge-Form { id: 0, badge_category: "progress" }', () => {
    const result = deriveMilestoneBadge(200)
    expect(result?.id).toBe(0)
    expect(result?.badge_category).toBe('progress')
  })
})

describe('getMemberBadgePresentation — role_volume_-Resolver (D-04, Typ 3)', () => {
  it('loest role_volume_translator_gold zu Gold-Tier-Praesentation auf', () => {
    const presentation = getMemberBadgePresentation('role_volume_translator_gold')
    expect(presentation.label).toBe('Gold · 320+')
    expect(presentation.group).toBe('roles')
    expect(presentation.roleCode).toBe('translator')
    expect(presentation.palette).toBe('gold')
  })

  it('parst Multi-Underscore-Rollencodes korrekt (kein naives split)', () => {
    const presentation = getMemberBadgePresentation('role_volume_quality_checker_bronze')
    expect(presentation.roleCode).toBe('quality_checker')
    expect(presentation.label).toBe('Bronze · 12+')
  })

  it('loest die Platin-Stufe auf', () => {
    const presentation = getMemberBadgePresentation('role_volume_translator_platinum')
    expect(presentation.label).toBe('Platin · 510+')
    expect(presentation.palette).toBe('platinum')
  })

  it('loest die Silber-Stufe auf', () => {
    const presentation = getMemberBadgePresentation('role_volume_translator_silver')
    expect(presentation.label).toBe('Silber · 108+')
    expect(presentation.palette).toBe('silver')
  })

  it('faellt bei unbekanntem Rollencode defensiv auf den rohen Code zurueck (kein throw)', () => {
    const presentation = getMemberBadgePresentation('role_volume_unknownrole_gold')
    expect(presentation.roleCode).toBe('unknownrole')
    expect(presentation.label).toBe('Gold · 320+')
  })

  it('laesst statische Codes unveraendert (kein Regress)', () => {
    const presentation = getMemberBadgePresentation('founding_member')
    expect(presentation.label).toBe('Gründungsmitglied')
    expect(presentation.group).toBe('membership')
  })
})

describe('resolveNextPointMilestone (Phase 116 D-04 — naechste Punkt-Schwelle)', () => {
  it('liefert kein aktuelles Badge und Schwelle 1 bei 0 Punkten', () => {
    const result = resolveNextPointMilestone(0)
    expect(result.currentBadge).toBeNull()
    expect(result.nextThreshold).toBe(1)
  })

  it('liefert point_milestone_active und Schwelle 200 bei 50 Punkten', () => {
    const result = resolveNextPointMilestone(50)
    expect(result.currentBadge?.badge_code).toBe('point_milestone_active')
    expect(result.nextThreshold).toBe(200)
  })

  it('liefert point_milestone_legend und keine weitere Schwelle bei 2500 Punkten', () => {
    const result = resolveNextPointMilestone(2500)
    expect(result.currentBadge?.badge_code).toBe('point_milestone_legend')
    expect(result.nextThreshold).toBeNull()
  })
})

describe('resolveNextRoleVolumeThreshold (Phase 116 D-04 — naechste Rollen-Volumen-Stufe)', () => {
  it('liefert leere aktuelle Stufe und Schwelle 12/Bronze bei 0', () => {
    const result = resolveNextRoleVolumeThreshold(0)
    expect(result.currentTier).toBe('')
    expect(result.nextThreshold).toBe(12)
    expect(result.nextTierLabel).toBe('Bronze')
  })

  it('liefert bronze und Schwelle 108/Silber bei 12', () => {
    const result = resolveNextRoleVolumeThreshold(12)
    expect(result.currentTier).toBe('bronze')
    expect(result.nextThreshold).toBe(108)
    expect(result.nextTierLabel).toBe('Silber')
  })

  it('liefert platinum und keine weitere Schwelle bei 510', () => {
    const result = resolveNextRoleVolumeThreshold(510)
    expect(result.currentTier).toBe('platinum')
    expect(result.nextThreshold).toBeNull()
    expect(result.nextTierLabel).toBeNull()
  })
})
describe('resolveRoleProgressPresentation (Phase 118 — Rollenfortschritt)', () => {
  it.each([
    [0, null, 12, 'Bronze'], [1, 'entry', 12, 'Bronze'], [11, 'entry', 12, 'Bronze'],
    [12, 'bronze', 108, 'Silber'], [107, 'bronze', 108, 'Silber'],
    [108, 'silver', 320, 'Gold'], [319, 'silver', 320, 'Gold'],
    [320, 'gold', 510, 'Platin'], [509, 'gold', 510, 'Platin'],
    [510, 'platinum', null, null],
  ])('resolves %i Mitwirkungen at every boundary', (count, tier, nextThreshold, nextTierLabel) => {
    expect(resolveRoleProgressPresentation(count)).toMatchObject({ tier, nextThreshold, nextTierLabel })
  })

  it('keeps exact rank and progress copy at entry, intermediate, and terminal states', () => {
    expect(resolveRoleProgressPresentation(1)).toMatchObject({
      rankLabel: 'Einstieg · 1+',
      progressCopy: '1 von 12 Mitwirkungen · Noch 11 bis Bronze',
    })
    expect(resolveRoleProgressPresentation(108)).toMatchObject({
      rankLabel: 'Silber · 108+',
      progressCopy: '108 von 320 Mitwirkungen · Noch 212 bis Gold',
    })
    expect(resolveRoleProgressPresentation(777)).toMatchObject({
      rankLabel: 'Platin · 510+',
      progressCopy: '777 Mitwirkungen · Höchste Stufe erreicht',
      progressValue: 510, progressMax: 510,
    })
  })
})

describe('Phase 121 Rollen-Schwellen- und Parsing-Matrix', () => {
  it('verwendet unverändert die vier kanonischen Volumenschwellen', () => {
    expect(ROLE_VOLUME_TIER_THRESHOLDS).toEqual({
      bronze: 12,
      silver: 108,
      gold: 320,
      platinum: 510,
    })
  })

  it.each([
    [0, null, 12, '0 von 12 Mitwirkungen · Noch 12 bis Bronze'],
    [1, 'entry', 12, '1 von 12 Mitwirkungen · Noch 11 bis Bronze'],
    [11, 'entry', 12, '11 von 12 Mitwirkungen · Noch 1 bis Bronze'],
    [12, 'bronze', 108, '12 von 108 Mitwirkungen · Noch 96 bis Silber'],
    [107, 'bronze', 108, '107 von 108 Mitwirkungen · Noch 1 bis Silber'],
    [108, 'silver', 320, '108 von 320 Mitwirkungen · Noch 212 bis Gold'],
    [319, 'silver', 320, '319 von 320 Mitwirkungen · Noch 1 bis Gold'],
    [320, 'gold', 510, '320 von 510 Mitwirkungen · Noch 190 bis Platin'],
    [509, 'gold', 510, '509 von 510 Mitwirkungen · Noch 1 bis Platin'],
    [510, 'platinum', null, '510 Mitwirkungen · Höchste Stufe erreicht'],
    [687, 'platinum', null, '687 Mitwirkungen · Höchste Stufe erreicht'],
  ])('bewahrt bei %i den echten Count, Rang und das nächste Ziel', (count, tier, nextThreshold, progressCopy) => {
    expect(resolveRoleProgressPresentation(count)).toMatchObject({
      tier,
      nextThreshold,
      progressCopy,
    })
  })

  it.each([
    ['quality_checker', 'quality_checker'],
    ['raw_provider', 'raw_provider'],
    ['project_lead', 'project_lead'],
  ])('parst den Unterstrichcode %s suffixbasiert', (roleCode, expectedRoleCode) => {
    expect(getMemberBadgePresentation(`role_volume_${roleCode}_gold`).roleCode).toBe(expectedRoleCode)
  })
})

describe('Phase 119 canonical badge-family resolver contract', () => {
  type Stage = { badge_code: string; threshold: number; label: string }
  type Family = { key: string; stages: Stage[] }
  type ResolveFamilies = (input: {
    earned_codes: string[]
    badge_progress: Array<{ family: string; current_count: number; next_threshold: number | null; remaining_count: number | null; next_tier: string | null; complete: boolean }>
    catalog?: Stage[]
  }) => Family[]

  async function resolver(): Promise<ResolveFamilies> {
    const labels = await import('./memberBadgeLabels')
    expect(labels).toHaveProperty('resolveMemberBadgeFamilies')
    return (labels as unknown as { resolveMemberBadgeFamilies: ResolveFamilies }).resolveMemberBadgeFamilies
  }

  it('owns every known badge code exactly once and keeps stable family order', async () => {
    const resolve = await resolver()
    const families = resolve({
      earned_codes: ['first_contribution', 'point_milestone_active', 'contribution_projects_bronze', 'founding_member'],
      badge_progress: [
        { family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false },
        { family: 'points', current_count: 50, next_threshold: 200, remaining_count: 150, next_tier: '200 Punkte', complete: false },
        { family: 'contribution_projects', current_count: 3, next_threshold: 5, remaining_count: 2, next_tier: 'Silber', complete: false },
        { family: 'membership', current_count: 0, next_threshold: 5, remaining_count: 5, next_tier: '5 Jahre', complete: false },
      ],
    })
    expect(families.map((family) => family.key)).toEqual(['progress', 'points', 'contribution_projects', 'membership'])
    const ownedCodes = families.flatMap((family) => family.stages.map((stage) => stage.badge_code))
    expect(new Set(ownedCodes).size).toBe(ownedCodes.length)
  })

  it('sorts thresholds numerically and appends a synthetic catalog stage automatically', async () => {
    const resolve = await resolver()
    const families = resolve({
      earned_codes: ['first_contribution'],
      badge_progress: [{ family: 'progress', current_count: 1, next_threshold: 10, remaining_count: 9, next_tier: '10 Projekte', complete: false }],
      catalog: [
        { badge_code: 'productive_100', threshold: 100, label: '100 Projekte' },
        { badge_code: 'first_contribution', threshold: 1, label: 'Erste Mitwirkung' },
        { badge_code: 'productive_bronze', threshold: 10, label: '10 Projekte' },
      ],
    })
    expect(families[0]?.stages.map((stage) => stage.threshold)).toEqual([1, 10, 100])
  })

  it('renders an unknown earned code once as a one-stage special without fabricating locked stages', async () => {
    const resolve = await resolver()
    const families = resolve({ earned_codes: ['future_special', 'future_special'], badge_progress: [] })
    expect(families.find((family) => family.key === 'special')?.stages).toEqual([
      expect.objectContaining({ badge_code: 'future_special' }),
    ])
  })
})
