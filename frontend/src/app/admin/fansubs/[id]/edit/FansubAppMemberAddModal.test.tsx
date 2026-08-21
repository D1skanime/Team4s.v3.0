// @vitest-environment jsdom

import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FansubAppMemberAddModal } from './FansubAppMemberAddModal'

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
