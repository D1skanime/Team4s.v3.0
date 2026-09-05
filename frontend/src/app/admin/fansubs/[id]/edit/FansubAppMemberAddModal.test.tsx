// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { catalogRoles, useRoleCatalogMock } = vi.hoisted(() => ({
  catalogRoles: [
    { code: 'founder', label_de: 'Gründung', contexts: ['fansub_group'], sort_order: 5, color_key: '#8c4a16', icon_key: 'other' },
    { code: 'co_leader', label_de: 'Co-Leitung', contexts: ['fansub_group'], sort_order: 10, color_key: '#0f766e', icon_key: 'other' },
  ],
  useRoleCatalogMock: vi.fn(),
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: (...args: unknown[]) => useRoleCatalogMock(...args),
}))

import { FansubAppMemberAddModal } from './FansubAppMemberAddModal'

beforeEach(() => {
  useRoleCatalogMock.mockReturnValue({ roles: catalogRoles, error: null })
})

afterEach(() => {
  cleanup()
})

function SelectionHarness() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  return (
    <FansubAppMemberAddModal
      open
      canManageMembers
      canCreateInvitation={false}
      candidateQuery="founder"
      candidateResults={[]}
      selectedCandidateId="12"
      selectedCandidate={{ app_user_id: 12, member_id: 45, fansub_name: 'founder' }}
      selectedRoles={selectedRoles}
      historicalIdentityOptions={[]}
      selectedHistoricalMemberId=""
      isSearching={false}
      isAdding={false}
      inviteEmail=""
      inviteRoles={[]}
      isCreatingInvite={false}
      roleOptions={[
        { code: 'founder', label: 'Gründung' },
        { code: 'co_leader', label: 'Co-Leitung' },
      ]}
      onClose={vi.fn()}
      onCandidateQueryChange={vi.fn()}
      onCandidateSelect={vi.fn()}
      onToggleRole={(role) => setSelectedRoles((current) => (
        current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
      ))}
      onHistoricalMemberChange={vi.fn()}
      onAddMember={vi.fn()}
      onInviteEmailChange={vi.fn()}
      onToggleInviteRole={vi.fn()}
      onCreateInvitation={vi.fn()}
    />
  )
}

describe('FansubAppMemberAddModal role selection', () => {
  it.each(['Gründung', 'Co-Leitung'])('shows a clear selected state for %s', (label) => {
    render(<SelectionHarness />)

    const roleButton = screen.getByRole('button', { name: label })
    expect(roleButton.getAttribute('aria-pressed')).toBe('false')
    expect(roleButton.querySelector('svg')).toBeNull()

    fireEvent.click(roleButton)

    expect(roleButton.getAttribute('aria-pressed')).toBe('true')
    expect(roleButton.querySelector('svg')).not.toBeNull()
  })
})

describe('FansubAppMemberAddModal role-option button — data-color-key seam (Phase 148-08)', () => {
  it('carries the catalog color_key on the role-option button and no role-code-specific class', () => {
    render(<SelectionHarness />)

    const founderButton = screen.getByRole('button', { name: 'Gründung' })
    expect(founderButton.getAttribute('data-color-key')).toBe('#8c4a16')
    expect(founderButton.className).not.toMatch(/fansubEditRoleLead|fansubEditRoleProjectLead|fansubEditRoleEditor|fansubEditRoleTranslator|fansubEditRoleTimer|fansubEditRoleTypesetter|fansubEditRoleQuality|fansubEditRoleEncoder|fansubEditRoleDefault/)

    const coLeaderButton = screen.getByRole('button', { name: 'Co-Leitung' })
    expect(coLeaderButton.getAttribute('data-color-key')).toBe('#0f766e')
  })

  it('changes data-color-key when the catalog color_key changes, but not when only label_de changes', () => {
    const { unmount } = render(<SelectionHarness />)
    expect(screen.getByRole('button', { name: 'Gründung' }).getAttribute('data-color-key')).toBe('#8c4a16')
    unmount()
    cleanup()

    useRoleCatalogMock.mockReturnValue({
      roles: catalogRoles.map((role) => (role.code === 'founder' ? { ...role, color_key: '#a04444' } : role)),
      error: null,
    })
    const { unmount: unmountColorChanged } = render(<SelectionHarness />)
    expect(screen.getByRole('button', { name: 'Gründung' }).getAttribute('data-color-key')).toBe('#a04444')
    unmountColorChanged()
    cleanup()

    useRoleCatalogMock.mockReturnValue({
      roles: catalogRoles.map((role) => (role.code === 'founder' ? { ...role, label_de: 'Zweite Gründung' } : role)),
      error: null,
    })
    render(<SelectionHarness />)
    expect(screen.getByRole('button', { name: 'Gründung' }).getAttribute('data-color-key')).toBe('#8c4a16')
  })
})
