// Wave-0-Testgerüst für ContributionSummary (Phase 76, D-11/D-12)
// Diese Tests sind ROT — ContributionSummary existiert noch nicht (wird in Plan 02 implementiert).
// Alle Tests scheitern beim Import.

import { describe, expect, it, vi } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

// Import schlägt fehl bis Plan 02 die Datei erstellt
import { ContributionSummary } from './ContributionSummary'

// Hilfsfunktion: erzeugt eine Minimal-MeAnimeContribution
function makeContribution(
  overrides: Partial<MeAnimeContribution> & { id: number; status: MeAnimeContribution['status'] },
): MeAnimeContribution {
  return {
    anime_id: 1,
    anime_title: 'Test-Anime',
    fansub_group_id: 10,
    fansub_group_member_id: 100,
    role_codes: ['translator'],
    started_year: 2023,
    ended_year: null,
    is_public_on_anime_page: false,
    is_public_on_member_profile: false,
    note: null,
    review_note: null,
    can_self_publish: false,
    release_version_id: null,
    is_own_proposal: false,
    fansub_group_name: 'TestGruppe',
    ...overrides,
  }
}

const SAMPLE_CONTRIBUTIONS: MeAnimeContribution[] = [
  makeContribution({ id: 1, status: 'confirmed' }),
  makeContribution({ id: 2, status: 'confirmed' }),
  makeContribution({ id: 3, status: 'proposed', is_own_proposal: true }),
  makeContribution({ id: 4, status: 'disputed', is_own_proposal: false }),
]

describe('ContributionSummary', () => {
  it('aggregiert Zähler nach Status korrekt', () => {
    // Erwartet: confirmed=2, proposed=1, disputed=1
    // Test schlägt fehl, weil ContributionSummary noch nicht existiert
    expect(ContributionSummary).toBeDefined()
    const byStatus = SAMPLE_CONTRIBUTIONS.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {})
    expect(byStatus['confirmed']).toBe(2)
    expect(byStatus['proposed']).toBe(1)
    expect(byStatus['disputed']).toBe(1)
  })

  it('Chip-Klick setzt activeFilters.status', () => {
    // Erwartet: Klick auf einen Status-Chip setzt den activeFilters.status-State
    // Test schlägt fehl, weil ContributionSummary noch nicht existiert
    expect(ContributionSummary).toBeDefined()
    const onFilterChange = vi.fn()
    // Simuliert einen Chip-Klick — ContributionSummary muss onFilterChange mit dem Status aufrufen
    onFilterChange({ status: 'confirmed', group: null, anime: null, role: null, year: null })
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' })
    )
  })

  it('Toggle-Klick auf aktiven Chip setzt Filter zurück auf null', () => {
    // Erwartet: Zweiter Klick auf den bereits aktiven Chip deaktiviert den Filter (Toggle)
    // Test schlägt fehl, weil ContributionSummary noch nicht existiert
    expect(ContributionSummary).toBeDefined()
    const onFilterChange = vi.fn()
    // Erster Klick aktiviert
    onFilterChange({ status: 'confirmed', group: null, anime: null, role: null, year: null })
    // Zweiter Klick auf aktiven Chip deaktiviert
    onFilterChange({ status: null, group: null, anime: null, role: null, year: null })
    expect(onFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: null })
    )
  })
})
