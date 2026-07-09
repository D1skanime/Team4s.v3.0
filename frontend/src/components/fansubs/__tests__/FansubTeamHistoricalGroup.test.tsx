// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FansubTeamHistoricalGroup } from '../FansubTeamHistoricalGroup'
import type { DomainProjectionHistoricalRow } from '@/types/domain-projection'

afterEach(() => {
  cleanup()
})

function historicalMember(overrides: Partial<DomainProjectionHistoricalRow> = {}): DomainProjectionHistoricalRow {
  return {
    id: 1,
    member_id: 101,
    member_display_name: 'Ehemalig',
    member_slug: null,
    roles: ['timing'],
    role_labels: ['Timing'],
    joined_year: 2008,
    left_year: 2011,
    status: 'historical',
    profile_status: 'historical',
    claimed: true,
    ...overrides,
  }
}

describe('FansubTeamHistoricalGroup', () => {
  it('zeigt Rolle und Zeitraum je Eintrag', () => {
    render(<FansubTeamHistoricalGroup historical={[historicalMember()]} />)

    expect(screen.getByText('Timing')).toBeTruthy()
    expect(screen.getByText('2008–2011')).toBeTruthy()
  })

  it('zeigt "seit JJJJ" ohne Enddatum und behält das unbestätigt-Badge', () => {
    render(
      <FansubTeamHistoricalGroup
        historical={[
          historicalMember({
            id: 2,
            member_display_name: 'Unbestätigt',
            claimed: false,
            joined_year: 2015,
            left_year: null,
          }),
        ]}
      />,
    )

    expect(screen.getByText('seit 2015')).toBeTruthy()
    expect(screen.getByText('unbestätigt')).toBeTruthy()
  })

  it('klappt eine lange historische Liste ein und zeigt "X weitere anzeigen"', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      historicalMember({
        id: 10 + index,
        member_display_name: 'Mitglied ' + index,
        claimed: true,
      }),
    )

    render(<FansubTeamHistoricalGroup historical={many} />)

    expect(screen.getByText('Mitglied 0')).toBeTruthy()
    expect(screen.queryByText('Mitglied 11')).toBeNull()

    const toggle = screen.getByRole('button', { name: /weitere anzeigen/i })
    fireEvent.click(toggle)

    expect(screen.getByText('Mitglied 11')).toBeTruthy()
  })
})
