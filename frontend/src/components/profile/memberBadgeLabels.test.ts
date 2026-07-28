import { describe, expect, it } from 'vitest'

// deriveMilestoneBadge existiert noch nicht in memberBadgeLabels.ts — macht diesen Test
// legitim RED (Task 1, Typ-2-Grenzwerte D-01/D-03).
import { deriveMilestoneBadge, getMemberBadgePresentation } from './memberBadgeLabels'

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
