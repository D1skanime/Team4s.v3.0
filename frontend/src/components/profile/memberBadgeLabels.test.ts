import { describe, expect, it } from 'vitest'
import { FolderCheck, Images, ScrollText } from 'lucide-react'

import {
  getMemberBadgePresentation,
  MEMBER_BADGE_GROUP_LABELS,
  MEMBER_BADGE_GROUP_ORDER,
  MEMBER_BADGE_PRESENTATIONS,
  PUBLIC_MEMBER_BADGE_CATALOG,
} from './memberBadgeLabels'
import {
  resolveMemberBadgeFamilies,
  resolveRoleProgressPresentation,
} from './memberBadgeFamilies'

// Phase 150 (D-24): eine geteilte Stufen-Referenztabelle je Familie -- dieselben Zahlen, die
// seit Plan 150-03 backend-seitig in badge_progress[].stages ausgeliefert werden (siehe
// 150-05-PLAN.md's Stage-Code-Referenztabelle). Tests bauen ihre badge_progress-Fixtures
// daraus statt acht unabhaengige Kopien driften zu lassen.
const FAMILY_STAGE_FIXTURES: Record<string, Array<{ code: string; threshold: number }>> = {
  progress: [
    { code: 'first_contribution', threshold: 1 },
    { code: 'productive_bronze', threshold: 10 },
    { code: 'productive_silver', threshold: 25 },
    { code: 'productive_gold', threshold: 50 },
  ],
  points: [
    { code: 'point_milestone_first', threshold: 1 },
    { code: 'point_milestone_active', threshold: 50 },
    { code: 'point_milestone_experienced', threshold: 200 },
    { code: 'point_milestone_engaged', threshold: 500 },
    { code: 'point_milestone_veteran', threshold: 1000 },
    { code: 'point_milestone_legend', threshold: 2500 },
  ],
  contribution_projects: [
    { code: 'bronze', threshold: 1 },
    { code: 'silver', threshold: 5 },
    { code: 'gold', threshold: 15 },
  ],
  contribution_chronicle: [
    { code: 'bronze', threshold: 10 },
    { code: 'silver', threshold: 50 },
    { code: 'gold', threshold: 150 },
  ],
  contribution_archivist: [
    { code: 'bronze', threshold: 10 },
    { code: 'silver', threshold: 50 },
    { code: 'gold', threshold: 150 },
  ],
  membership: [
    { code: 'long_term_member', threshold: 5 },
    { code: 'membership_7_years', threshold: 7 },
    { code: 'membership_10_years', threshold: 10 },
  ],
  role_volume: [
    { code: 'entry', threshold: 1 },
    { code: 'bronze', threshold: 12 },
    { code: 'silver', threshold: 108 },
    { code: 'gold', threshold: 320 },
    { code: 'platinum', threshold: 510 },
  ],
}

// D-25 (fuenfte/sechste Fundstelle): resolveRoleProgressPresentation nimmt seit Task 2 den
// passenden role_volume-badge_progress-Eintrag statt eines rohen Zaehlwerts entgegen -- dieser
// Helfer baut ein minimales, aber vollstaendiges role_volume-Progress-Objekt fuer Tests, die
// vorher nur `resolveRoleProgressPresentation(count)` aufgerufen haben.
function roleVolumeProgress(count: number) {
  return {
    family: 'role_volume',
    current_count: count,
    current_tier: '',
    next_threshold: null,
    remaining_count: null,
    next_tier: null,
    complete: false,
    stages: FAMILY_STAGE_FIXTURES.role_volume,
  }
}

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

describe('getMemberBadgePresentation — role_volume_-Resolver (D-04, Typ 3)', () => {
  // D-29 (sechste Fundstelle): das Label ist seit Task 3 nur noch der nackte Tier-Name (keine
  // "· <Zahl>+"-Suffix mehr) -- ROLE_VOLUME_TIER_THRESHOLDS ist geloescht, diese Funktion hat
  // keine legitime Quelle mehr fuer die Schwellenzahl. Das byte-identische "<Label> · <Zahl>+"
  // bleibt trotzdem live, rekonstruiert an CategoryProgressTable.tsx's buildRoleVolumeRow (siehe
  // CategoryProgressTable.test.tsx:98) -- diese unit-level Assertions pruefen NICHT jene DOM-
  // Stelle, sondern resolveRoleVolumePresentation's eigenen Rueckgabewert direkt.
  it('loest role_volume_translator_gold zu Gold-Tier-Praesentation auf', () => {
    const presentation = getMemberBadgePresentation('role_volume_translator_gold')
    expect(presentation.label).toBe('Gold')
    expect(presentation.group).toBe('roles')
    expect(presentation.roleCode).toBe('translator')
    expect(presentation.palette).toBe('gold')
  })

  it('parst Multi-Underscore-Rollencodes korrekt (kein naives split)', () => {
    const presentation = getMemberBadgePresentation('role_volume_quality_checker_bronze')
    expect(presentation.roleCode).toBe('quality_checker')
    expect(presentation.label).toBe('Bronze')
  })

  it('loest die Platin-Stufe auf', () => {
    const presentation = getMemberBadgePresentation('role_volume_translator_platinum')
    expect(presentation.label).toBe('Platin')
    expect(presentation.palette).toBe('platinum')
  })

  it('loest die Silber-Stufe auf', () => {
    const presentation = getMemberBadgePresentation('role_volume_translator_silver')
    expect(presentation.label).toBe('Silber')
    expect(presentation.palette).toBe('silver')
  })

  it('faellt bei unbekanntem Rollencode defensiv auf den rohen Code zurueck (kein throw)', () => {
    const presentation = getMemberBadgePresentation('role_volume_unknownrole_gold')
    expect(presentation.roleCode).toBe('unknownrole')
    expect(presentation.label).toBe('Gold')
  })

  it('laesst statische Codes unveraendert (kein Regress)', () => {
    const presentation = getMemberBadgePresentation('founding_member')
    expect(presentation.label).toBe('Gründungsmitglied')
    expect(presentation.group).toBe('membership')
  })
})

describe('Phase 124 canonical points-family boundary oracle', () => {
  const orderedCodes = ['point_milestone_first', 'point_milestone_active', 'point_milestone_experienced', 'point_milestone_engaged', 'point_milestone_veteran', 'point_milestone_legend']
  const orderedThresholds = [1, 50, 200, 500, 1000, 2500]
  it.each([
    [0, null, 1, 1, 0, false], [1, 'point_milestone_first', 50, 49, 2, false],
    [49, 'point_milestone_first', 50, 1, 98, false], [50, 'point_milestone_active', 200, 150, 25, false],
    [199, 'point_milestone_active', 200, 1, 100, false], [200, 'point_milestone_experienced', 500, 300, 40, false],
    [499, 'point_milestone_experienced', 500, 1, 100, false], [500, 'point_milestone_engaged', 1000, 500, 50, false],
    [999, 'point_milestone_engaged', 1000, 1, 100, false], [1000, 'point_milestone_veteran', 2500, 1500, 40, false],
    [2499, 'point_milestone_veteran', 2500, 1, 100, false], [2500, 'point_milestone_legend', null, null, 100, true],
    [2733, 'point_milestone_legend', null, null, 100, true], [5000, 'point_milestone_legend', null, null, 100, true],
  ])('resolves %i points without duplicating production thresholds', (points, currentCode, nextThreshold, remainingCount, percent, complete) => {
    // Phase 150 (D-12/D-13): deriveMilestoneBadge/resolveNextPointMilestone sind geloescht --
    // currentCode/nextThreshold/remainingCount/complete sind jetzt genau die Felder, die der
    // Server in badge_progress[] fuer die "points"-Familie liefert (simuliert hier als reale
    // Eingabe fuer resolveMemberBadgeFamilies, statt clientseitig aus total_points abgeleitet).
    const family = resolveMemberBadgeFamilies({
      earned_codes: currentCode ? [currentCode] : [],
      badge_progress: [{
        family: 'points', current_count: points, current_tier: currentCode ?? '', next_threshold: nextThreshold,
        remaining_count: remainingCount, next_tier: nextThreshold == null ? null : String(nextThreshold),
        complete, stages: FAMILY_STAGE_FIXTURES.points,
      }],
    }).find((candidate) => candidate.key === 'points')
    expect(family?.stages.map(({ threshold }) => threshold)).toEqual(orderedThresholds)
    expect(family).toMatchObject({ currentStage: currentCode ? { badge_code: currentCode } : null, nextThreshold, remainingCount, complete })
    expect(family?.stages.map(({ threshold, earned, locked }) => ({ threshold, earned, locked }))).toEqual(
      orderedThresholds.map((threshold) => ({ threshold, earned: points >= threshold, locked: points < threshold })),
    )
    const progressMax = nextThreshold ?? orderedThresholds.at(-1)!
    expect(Math.round((Math.min(points, progressMax) / progressMax) * 100)).toBe(percent)
    expect(orderedCodes).toHaveLength(orderedThresholds.length)
  })
})

describe('Phase 121 Rollen-Schwellen-Grenzwerte (D-22 Anti-Drift-Fix)', () => {
  // D-22: der fruehere Test hier verglich ROLE_VOLUME_TIER_THRESHOLDS (Frontend-Konstante, seit
  // Task 3 geloescht) nur gegen eine zweite, ebenfalls hartcodierte Kopie derselben Zahlen im
  // Testkoerper selbst -- das konnte niemals eine echte Drift zur Backend-Registry erkennen.
  // Diese exakten Grenzwerte (12/108/320/510) sind stattdessen serverseitig bewiesen durch
  // TestLoadRoleVolumeBadgesPostgresProgressBoundaries in
  // backend/internal/repository/member_profile_role_volume_repository_test.go (Plan 150-03) --
  // ein echter Postgres-Integrationstest gegen die Registry, keine zweite hartcodierte Liste.
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
    expect(resolveRoleProgressPresentation(roleVolumeProgress(count))).toMatchObject({
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

describe('resolveRoleProgressPresentation (Phase 118 — Rollenfortschritt)', () => {
  it.each([
    [0, null, 12, 'Bronze'], [1, 'entry', 12, 'Bronze'], [11, 'entry', 12, 'Bronze'],
    [12, 'bronze', 108, 'Silber'], [107, 'bronze', 108, 'Silber'],
    [108, 'silver', 320, 'Gold'], [319, 'silver', 320, 'Gold'],
    [320, 'gold', 510, 'Platin'], [509, 'gold', 510, 'Platin'],
    [510, 'platinum', null, null],
  ])('resolves %i Mitwirkungen at every boundary', (count, tier, nextThreshold, nextTierLabel) => {
    expect(resolveRoleProgressPresentation(roleVolumeProgress(count))).toMatchObject({ tier, nextThreshold, nextTierLabel })
  })

  it('keeps exact rank and progress copy at entry, intermediate, and terminal states', () => {
    expect(resolveRoleProgressPresentation(roleVolumeProgress(1))).toMatchObject({
      tierLabel: 'Einstieg',
      rankLabel: 'Einstieg · 1+',
      progressCopy: '1 von 12 Mitwirkungen · Noch 11 bis Bronze',
      nextCopy: 'Noch 11 Mitwirkungen bis Bronze',
    })
    expect(resolveRoleProgressPresentation(roleVolumeProgress(108))).toMatchObject({
      tierLabel: 'Silber',
      rankLabel: 'Silber · 108+',
      progressCopy: '108 von 320 Mitwirkungen · Noch 212 bis Gold',
      nextCopy: 'Noch 212 Mitwirkungen bis Gold',
    })
    expect(resolveRoleProgressPresentation(roleVolumeProgress(777))).toMatchObject({
      tierLabel: 'Platin',
      rankLabel: 'Platin · 510+',
      progressCopy: '777 Mitwirkungen · Höchste Stufe erreicht',
      nextCopy: 'Höchste Stufe erreicht',
      progressValue: 510, progressMax: 510,
    })
  })

  it('resolveRoleProgressPresentation(undefined, 0) bleibt ein dokumentiert unerreichbarer Defensivpfad (D-25)', () => {
    // Kein passender role_volume-badge_progress-Eintrag: stages ist [], also bleiben
    // nextThreshold/nextTierLabel bewusst null statt auf ROLE_VOLUME_TIER_THRESHOLDS
    // zurueckzufallen (das Literal existiert nicht mehr). In Produktion unerreichbar, weil
    // jede Rolle in roleCounts einen passenden role_volume-Eintrag hat.
    expect(resolveRoleProgressPresentation(undefined, 0)).toMatchObject({
      tier: null,
      nextThreshold: null,
      nextTierLabel: null,
    })
  })
})

describe('Phase 119 canonical badge-family resolver contract', () => {
  type Stage = { badge_code: string; threshold: number; label: string }
  type Family = { key: string; stages: Stage[] }
  type ResolveFamilies = (input: {
    earned_codes: string[]
    badge_progress: Array<{
      family: string
      current_count: number
      next_threshold: number | null
      remaining_count: number | null
      next_tier: string | null
      complete: boolean
      stages?: Array<{ code: string; threshold: number }>
    }>
    catalog?: Stage[]
  }) => Family[]

  async function resolver(): Promise<ResolveFamilies> {
    const labels = await import('./memberBadgeFamilies')
    expect(labels).toHaveProperty('resolveMemberBadgeFamilies')
    return (labels as unknown as { resolveMemberBadgeFamilies: ResolveFamilies }).resolveMemberBadgeFamilies
  }

  it('owns every known badge code exactly once and keeps stable family order', async () => {
    const resolve = await resolver()
    const families = resolve({
      earned_codes: ['first_contribution', 'point_milestone_active', 'contribution_projects_bronze', 'founding_member'],
      badge_progress: [
        { family: 'progress', current_count: 10, next_threshold: 25, remaining_count: 15, next_tier: '25 Projekte', complete: false, stages: FAMILY_STAGE_FIXTURES.progress },
        { family: 'points', current_count: 50, next_threshold: 200, remaining_count: 150, next_tier: '200 Punkte', complete: false, stages: FAMILY_STAGE_FIXTURES.points },
        { family: 'contribution_projects', current_count: 3, next_threshold: 5, remaining_count: 2, next_tier: 'Silber', complete: false, stages: FAMILY_STAGE_FIXTURES.contribution_projects },
        { family: 'membership', current_count: 0, next_threshold: 5, remaining_count: 5, next_tier: '5 Jahre', complete: false, stages: FAMILY_STAGE_FIXTURES.membership },
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

describe('Phase 125 contribution boundary oracle', () => {
  const specs = [
    ['contribution_projects', 'mitgetragenes Projekt', 'mitgetragene Projekte', [[0,null,1,1,0,false],[1,'bronze',5,4,20,false],[4,'bronze',5,1,80,false],[5,'silver',15,10,33,false],[14,'silver',15,1,93,false],[15,'gold',null,null,100,true],[20,'gold',null,null,100,true]]],
    ['contribution_chronicle', 'Chronikbeitrag', 'Chronikbeiträge', [[0,null,10,10,0,false],[10,'bronze',50,40,20,false],[49,'bronze',50,1,98,false],[50,'silver',150,100,33,false],[149,'silver',150,1,99,false],[150,'gold',null,null,100,true],[200,'gold',null,null,100,true]]],
    ['contribution_archivist', 'Medienbeitrag', 'Medienbeiträge', [[0,null,10,10,0,false],[10,'bronze',50,40,20,false],[49,'bronze',50,1,98,false],[50,'silver',150,100,33,false],[149,'silver',150,1,99,false],[150,'gold',null,null,100,true],[200,'gold',null,null,100,true]]],
  ] as const

  it('keeps all three zero families visible in canonical order', () => {
    const badge_progress = [...specs].reverse().map(([family]) => ({
      family, current_count: 0, current_tier: '', next_threshold: family === 'contribution_projects' ? 1 : 10,
      remaining_count: family === 'contribution_projects' ? 1 : 10, next_tier: 'bronze', complete: false,
      stages: FAMILY_STAGE_FIXTURES[family],
    }))
    const result = resolveMemberBadgeFamilies({ earned_codes: [], badge_progress })
      .filter(({ group }) => group === 'contributions')
    expect(result.map(({ key }) => key)).toEqual(specs.map(([family]) => family))
    expect(result.every(({ currentStage, stages }) =>
      currentStage === null && stages.every(({ earned, locked }) => !earned && locked))).toBe(true)
  })

  it.each(specs.flatMap(([family, singular, plural, cases]) =>
    cases.map((boundary) => [family, singular, plural, boundary] as const),
  ))('%s consumes authoritative boundary %j', (key, singular, plural, boundary) => {
    const [value, tier, nextThreshold, remainingCount, percent, complete] = boundary
    const family = resolveMemberBadgeFamilies({
      earned_codes: [],
      badge_progress: [{ family: key, current_count: value, current_tier: tier ?? '', next_threshold: nextThreshold, remaining_count: remainingCount, next_tier: null, complete, stages: FAMILY_STAGE_FIXTURES[key] }],
    }).find(({ key: candidate }) => candidate === key)!
    const max = nextThreshold ?? family.stages.at(-1)!.threshold
    expect(family).toMatchObject({
      currentCount: value, currentStage: tier ? { badge_code: key + '_' + tier } : null,
      nextThreshold, remainingCount, complete, unitSingular: singular, unitPlural: plural,
    })
    expect(family.stages.map(({ threshold, earned, locked }) => ({ threshold, earned, locked })))
      .toEqual(family.stages.map(({ threshold }) => ({ threshold, earned: value >= threshold, locked: value < threshold })))
    expect(Math.round((Math.min(value, max) / max) * 100)).toBe(percent)
  })
})

describe('Phase 126 independent membership presentation contract', () => {
  const durationCodes = ['long_term_member', 'membership_7_years', 'membership_10_years']

  function resolveMembership(currentCount: number, earned_codes: string[] = []) {
    const nextThreshold = currentCount < 5 ? 5 : currentCount < 7 ? 7 : currentCount < 10 ? 10 : null
    return resolveMemberBadgeFamilies({
      earned_codes,
      badge_progress: [{
        family: 'membership', current_count: currentCount, current_tier: '', next_threshold: nextThreshold,
        remaining_count: nextThreshold == null ? null : nextThreshold - currentCount,
        next_tier: nextThreshold == null ? null : `${nextThreshold} Jahre`, complete: nextThreshold == null,
        stages: FAMILY_STAGE_FIXTURES.membership,
      }],
    }).find(({ key }) => key === 'membership')!
  }

  it('resolves the exact membership duration boundary matrix', () => {
    const cases = [
      [0, null, 5, 5, false], [1, null, 5, 4, false], [4, null, 5, 1, false],
      [5, 'long_term_member', 7, 2, false], [6, 'long_term_member', 7, 1, false],
      [7, 'membership_7_years', 10, 3, false], [8, 'membership_7_years', 10, 2, false],
      [9, 'membership_7_years', 10, 1, false], [10, 'membership_10_years', null, null, true],
      [11, 'membership_10_years', null, null, true], [24, 'membership_10_years', null, null, true],
    ] as const
    for (const [count, currentCode, nextThreshold, remainingCount, complete] of cases) {
      const family = resolveMembership(count)
      expect(family.stages.map(({ badge_code }) => badge_code)).toEqual(durationCodes)
      expect(family).toMatchObject({
        currentCount: count, currentStage: currentCode == null ? null : { badge_code: currentCode },
        nextStage: nextThreshold == null ? null : {
          badge_code: nextThreshold === 5 ? 'long_term_member' : `membership_${nextThreshold}_years`,
        },
        heroStage: { badge_code: currentCode ?? 'long_term_member' },
        nextThreshold, remainingCount, complete,
      })
      expect(family.stages.map(({ badge_code, earned, locked }) => ({ badge_code, earned, locked })))
        .toEqual(durationCodes.map((badge_code, index) => ({
          badge_code, earned: count >= [5, 7, 10][index], locked: count < [5, 7, 10][index],
        })))
    }
  })

  it('keeps founding independent at 3 6 and 24 years', () => {
    for (const count of [3, 6, 24]) {
      for (const founder of [false, true]) {
        const family = resolveMembership(count, founder ? ['founding_member'] : [])
        const foundingStage = (family as typeof family & {
          foundingStage: { badge_code: string; earned: boolean } | null
        }).foundingStage
        expect(family.stages.map(({ badge_code }) => badge_code)).toEqual(durationCodes)
        expect(foundingStage).toEqual(founder
          ? expect.objectContaining({ badge_code: 'founding_member', earned: true })
          : null)
        expect(family.currentStage?.badge_code).not.toBe('founding_member')
        expect(family.nextStage?.badge_code).not.toBe('founding_member')
        expect(family.heroStage.badge_code).not.toBe('founding_member')
        expect(resolveMemberBadgeFamilies({
          earned_codes: founder ? ['founding_member'] : [],
          badge_progress: [{
            family: 'membership', current_count: count, current_tier: '',
            next_threshold: count < 5 ? 5 : count < 7 ? 7 : count < 10 ? 10 : null,
            remaining_count: count < 5 ? 5 - count : count < 7 ? 7 - count : count < 10 ? 10 - count : null,
            next_tier: null, complete: count >= 10, stages: FAMILY_STAGE_FIXTURES.membership,
          }],
        }).filter(({ key }) => key === 'special')).toHaveLength(0)
      }
    }
  })

  it('keeps longest single membership backend-authoritative', () => {
    const family = resolveMembership(24, [
      'founding_member', 'long_term_member', 'membership_7_years', 'membership_10_years',
    ])
    expect(family.stages.map(({ badge_code }) => badge_code)).toEqual(durationCodes)
    expect(family).toMatchObject({
      currentCount: 24, currentStage: { badge_code: 'membership_10_years' },
      heroStage: { badge_code: 'membership_10_years' }, nextStage: null,
      nextThreshold: null, remainingCount: null, complete: true,
    })
  })
})
