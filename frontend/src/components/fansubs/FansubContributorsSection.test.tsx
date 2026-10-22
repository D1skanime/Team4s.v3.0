import { describe, expect, it } from 'vitest'

import { selectFansubContributorKey } from './FansubContributorsSection'
import type { DomainProjectionContributorRow } from '@/types/domain-projection'

function contributorRow(overrides: Partial<DomainProjectionContributorRow> = {}): DomainProjectionContributorRow {
  return {
    id: 1,
    anime_id: 1,
    anime_title: 'Testanime',
    member_id: 1,
    member_display_name: 'Max Mustermann',
    member_slug: null,
    roles: [],
    role_labels: ['Übersetzung'],
    started_year: null,
    ended_year: null,
    status: 'active',
    dispute_state: 'none',
    visibility: 'public',
    review_status: 'approved',
    ...overrides,
  }
}

describe('selectFansubContributorKey', () => {
  it('liefert unterschiedliche Keys für gleichen Anzeigenamen bei unterschiedlicher id', () => {
    const first = contributorRow({ id: 1 })
    const second = contributorRow({ id: 2 })

    expect(selectFansubContributorKey(first)).not.toBe(selectFansubContributorKey(second))
  })

  it('liefert die contributor.id unverändert zurück', () => {
    const contributor = contributorRow({ id: 42 })

    expect(selectFansubContributorKey(contributor)).toBe(contributor.id)
  })
})
