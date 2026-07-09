// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FansubTeamActiveGroup } from '../FansubTeamActiveGroup'
import type { DomainProjectionMemberRow } from '@/types/domain-projection'

afterEach(() => {
  cleanup()
})

function activeMember(overrides: Partial<DomainProjectionMemberRow> = {}): DomainProjectionMemberRow {
  return {
    id: 1,
    member_id: 101,
    member_display_name: 'Aktives Mitglied',
    member_slug: 'aktives-mitglied',
    member_avatar_url: null,
    roles: ['translation'],
    role_labels: ['Übersetzung'],
    status: 'active',
    profile_status: 'active',
    claimed: true,
    ...overrides,
  }
}

describe('FansubTeamActiveGroup', () => {
  it('verlinkt Mitglieder mit oeffentlichem Profil klar erkennbar (Akzent + Chevron)', () => {
    const { container } = render(<FansubTeamActiveGroup members={[activeMember()]} />)

    const link = screen.getByRole('link', { name: /Aktives Mitglied/ })
    expect(link.getAttribute('href')).toBe('/members/aktives-mitglied')
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
  })

  it('rendert Mitglieder ohne oeffentliches Profil neutral ohne Link/Chevron', () => {
    const { container } = render(
      <FansubTeamActiveGroup
        members={[activeMember({ member_slug: null, member_display_name: 'Ohne Profil' })]}
      />,
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Ohne Profil')).toBeTruthy()
    expect(container.querySelector('svg')).toBeNull()
  })
})
