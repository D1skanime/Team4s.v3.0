import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ATTENTION_WINDOW_DAYS, filterAttentionContributions, groupAttentionContributions, isRecentlyAssigned, resolveWorkspaceHref } from './attentionHelpers'
import type { MeAnimeContribution } from '@/types/contributions'

describe('attentionHelpers (Phase 116, D-02)', () => {
  it('ATTENTION_WINDOW_DAYS ist 14', () => {
    expect(ATTENTION_WINDOW_DAYS).toBe(14)
  })

  describe('isRecentlyAssigned', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-28T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('gibt true zurueck fuer eine 8 Tage alte Zuweisung (innerhalb des Fensters)', () => {
      expect(isRecentlyAssigned('2026-07-20T00:00:00Z', 14)).toBe(true)
    })

    it('gibt false zurueck fuer eine 27 Tage alte Zuweisung (ausserhalb des Fensters)', () => {
      expect(isRecentlyAssigned('2026-07-01T00:00:00Z', 14)).toBe(false)
    })
  })

  describe('resolveWorkspaceHref', () => {
    it('verlinkt auf die Release-Version-Arbeitsflaeche wenn release_version_id gesetzt ist', () => {
      expect(
        resolveWorkspaceHref({ release_version_id: 62, anime_id: 5, fansub_group_id: 9 }),
      ).toBe('/me/releases/62/workspace?tab=segments')
    })

    it('verlinkt auf die Projekt-Arbeitsflaeche wenn release_version_id null ist', () => {
      expect(
        resolveWorkspaceHref({ release_version_id: null, anime_id: 5, fansub_group_id: 9 }),
      ).toBe('/me/projects/5/group/9')
    })
  })
})


describe('groupAttentionContributions', () => {
  function contribution(overrides: Partial<MeAnimeContribution>): MeAnimeContribution {
    return {
      id: 1,
      anime_id: 5,
      anime_title: 'Testanime',
      fansub_group_id: 9,
      fansub_group_member_id: 2,
      status: 'confirmed',
      role_codes: ['translator'],
      role_labels: ['Übersetzung'],
      started_year: null,
      ended_year: null,
      is_public_on_anime_page: true,
      is_public_on_member_profile: true,
      note: null,
      release_version_id: null,
      is_own_proposal: false,
      created_at: '2026-07-28T00:00:00Z',
      ...overrides,
    }
  }

  it('bündelt Aufgaben desselben Projekts und priorisiert eine Release-Ausnahme als Ziel', () => {
    const groups = groupAttentionContributions([
      contribution({ id: 1, release_version_id: null }),
      contribution({ id: 2, release_version_id: 61, episode_number: '05', role_codes: ['timer'] }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.contributions).toHaveLength(2)
    expect(groups[0]?.href).toBe('/me/releases/61/workspace?tab=segments')
  })

  it('setzt hasOwnRejectedWork=true, wenn eine Contribution in der Gruppe abgelehnte eigene Arbeit hat', () => {
    const groups = groupAttentionContributions([
      contribution({
        id: 3,
        release_version_id: 61,
        episode_number: '05',
        has_own_release_work: true,
        has_own_rejected_media: true,
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.hasOwnRejectedWork).toBe(true)
  })

  it('setzt hasOwnRejectedWork=false, wenn keine Contribution abgelehnte eigene Arbeit hat', () => {
    const groups = groupAttentionContributions([
      contribution({ id: 4, release_version_id: null }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.hasOwnRejectedWork).toBe(false)
  })
})

describe('filterAttentionContributions', () => {
  function contribution(overrides: Partial<MeAnimeContribution>): MeAnimeContribution {
    return {
      id: 1,
      anime_id: 5,
      anime_title: 'Testanime',
      fansub_group_id: 9,
      fansub_group_member_id: 2,
      status: 'confirmed',
      role_codes: ['translator'],
      role_labels: ['Übersetzung'],
      started_year: null,
      ended_year: null,
      is_public_on_anime_page: true,
      is_public_on_member_profile: true,
      note: null,
      release_version_id: null,
      is_own_proposal: false,
      created_at: '2026-07-28T00:00:00Z',
      ...overrides,
    }
  }

  it('behaelt eine Contribution mit has_own_release_work=true, wenn has_own_rejected_media=true ist', () => {
    const result = filterAttentionContributions([
      contribution({
        id: 1,
        release_version_id: 61,
        has_own_release_work: true,
        has_own_rejected_media: true,
      }),
    ])

    expect(result).toHaveLength(1)
  })

  it('behaelt eine Contribution mit has_own_release_work=true, wenn has_own_rejected_notes=true ist', () => {
    const result = filterAttentionContributions([
      contribution({
        id: 1,
        release_version_id: 61,
        has_own_release_work: true,
        has_own_rejected_notes: true,
      }),
    ])

    expect(result).toHaveLength(1)
  })

  it('verwirft weiterhin eine ausschliesslich erledigte Contribution ohne abgelehnte eigene Arbeit', () => {
    const result = filterAttentionContributions([
      contribution({
        id: 1,
        release_version_id: 61,
        has_own_release_work: true,
        has_own_rejected_notes: false,
        has_own_rejected_media: false,
      }),
    ])

    expect(result).toHaveLength(0)
  })
})
