import { describe, expect, it } from 'vitest'

// deriveMilestoneBadge existiert noch nicht in memberBadgeLabels.ts — macht diesen Test
// legitim RED (Task 1, Typ-2-Grenzwerte D-01/D-03).
import { deriveMilestoneBadge } from './memberBadgeLabels'

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
