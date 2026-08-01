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
