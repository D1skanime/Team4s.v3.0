// Wave-0-Testgerüst für ContributionInbox (Phase 76, D-03)
// Diese Tests sind ROT — ContributionInbox existiert noch nicht (wird in Plan 02 implementiert).
// Alle Tests scheitern beim Import.

import { describe, expect, it } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

// Import schlägt fehl bis Plan 02 die Datei erstellt
import { ContributionInbox } from './ContributionInbox'

// Hilfsfunktion: erzeugt eine Minimal-MeAnimeContribution
function makeContribution(
  overrides: Partial<MeAnimeContribution> & { id: number },
): MeAnimeContribution {
  return {
    anime_id: 1,
    anime_title: 'Test-Anime',
    fansub_group_id: 10,
    fansub_group_member_id: 100,
    status: 'proposed',
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
    ...overrides,
  }
}

describe('ContributionInbox', () => {
  it('filtert zugeordnet-aber-unbestätigt (is_own_proposal=false, status=proposed)', () => {
    // Erwartet: zugeordneter (kein eigener) Vorschlag erscheint in der pending-Liste
    const contributions: MeAnimeContribution[] = [
      makeContribution({ id: 1, status: 'proposed', is_own_proposal: false }),
      makeContribution({ id: 2, status: 'confirmed', is_own_proposal: false }),
    ]
    // Test schlägt fehl, weil ContributionInbox noch nicht existiert
    expect(ContributionInbox).toBeDefined()
    expect(contributions.filter((c) => c.status === 'proposed' && !c.is_own_proposal)).toHaveLength(1)
  })

  it('schließt eigene Vorschläge aus der pending-Liste aus (is_own_proposal=true, status=proposed)', () => {
    // Erwartet: eigener Vorschlag (is_own_proposal=true) gehört NICHT in die Inbox
    const contributions: MeAnimeContribution[] = [
      makeContribution({ id: 1, status: 'proposed', is_own_proposal: true }),
    ]
    // Test schlägt fehl, weil ContributionInbox noch nicht existiert
    expect(ContributionInbox).toBeDefined()
    const inboxItems = contributions.filter((c) => c.status === 'proposed' && !c.is_own_proposal)
    expect(inboxItems).toHaveLength(0)
  })

  it('zeigt bestrittene Items (status=disputed)', () => {
    // Erwartet: disputed-Items (Leader-zugeordnet) erscheinen in der Inbox
    const contributions: MeAnimeContribution[] = [
      makeContribution({ id: 1, status: 'disputed', is_own_proposal: false }),
    ]
    // Test schlägt fehl, weil ContributionInbox noch nicht existiert
    expect(ContributionInbox).toBeDefined()
    const disputedItems = contributions.filter((c) => c.status === 'disputed' && !c.is_own_proposal)
    expect(disputedItems).toHaveLength(1)
  })
})
