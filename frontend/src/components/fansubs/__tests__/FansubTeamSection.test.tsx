import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FansubTeamSection } from '../FansubTeamSection'
import type { DomainProjectionHistoricalRow, DomainProjectionMemberRow } from '@/types/domain-projection'

function activeMember(overrides: Partial<DomainProjectionMemberRow> = {}): DomainProjectionMemberRow {
  return {
    id: 1,
    member_id: 101,
    member_display_name: 'Aktives Mitglied',
    member_slug: 'aktives-mitglied',
    roles: ['translation'],
    role_labels: ['Übersetzung'],
    status: 'active',
    profile_status: 'active',
    claimed: true,
    ...overrides,
  }
}

function historicalMember(overrides: Partial<DomainProjectionHistoricalRow> = {}): DomainProjectionHistoricalRow {
  return {
    id: 2,
    member_id: 202,
    member_display_name: 'Historische Nennung',
    member_slug: null,
    roles: ['timing'],
    role_labels: ['Timing'],
    joined_year: 2008,
    left_year: 2011,
    status: 'historical',
    profile_status: 'historical',
    claimed: false,
    ...overrides,
  }
}

describe('FansubTeamSection', () => {
  it('trennt aktive, historische und Memorial-Mitglieder', () => {
    const html = renderToStaticMarkup(
      <FansubTeamSection
        members={[
          activeMember(),
          activeMember({
            id: 3,
            member_id: 303,
            member_display_name: 'Memorial Aktiv',
            member_slug: 'memorial-aktiv',
            profile_status: 'memorial',
          }),
        ]}
        historical={[
          historicalMember(),
          historicalMember({
            id: 4,
            member_id: 404,
            member_display_name: 'Ehemalig Bestätigt',
            member_slug: 'ehemalig',
            claimed: true,
          }),
        ]}
      />,
    )

    expect(html).toContain('Aktive Mitglieder')
    expect(html).toContain('Aktives Mitglied')
    expect(html).toContain('Historische Nennungen')
    expect(html).toContain('unbestätigt')
    expect(html).toContain('Ehemalige Mitglieder')
    expect(html).toContain('/members/ehemalig')
    expect(html).toContain('In Erinnerung')
    expect(html).toContain('Memorial Aktiv')
  })
})
