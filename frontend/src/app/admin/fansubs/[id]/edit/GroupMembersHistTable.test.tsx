// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { GroupMembersHistTable, type GroupMembersHistTableProps } from './GroupMembersHistTable'
import type { HistFansubGroupMember, HistGroupMemberRole } from '@/types/fansub'

afterEach(() => {
  cleanup()
})

const member: HistFansubGroupMember = {
  id: 12,
  fansub_group_id: 88,
  member_id: 2,
  display_name: 'Phase Admin',
  joined_date: '2005-01-01',
  left_date: null,
  app_user_id: null,
  app_username: null,
  status: 'historical',
  created_at: '2026-06-02T17:58:30.134384+02:00',
}

const memberRole: HistGroupMemberRole = {
  id: 77,
  fansub_group_member_id: 12,
  member_display_name: 'Phase Admin',
  role_code: 'co_leader',
  role_label: 'Co-Leitung',
  started_date: '2005-01-01',
  ended_date: '2010-01-01',
  note: null,
  status: 'historical',
  created_at: '2026-06-02T17:58:30.134384+02:00',
}

function baseProps(overrides: Partial<GroupMembersHistTableProps> = {}): GroupMembersHistTableProps {
  return {
    members: [member],
    rolesByMember: new Map([[member.id, [memberRole]]]),
    pendingClaimsByMember: new Map(),
    generatedInvites: {},
    memberInvitations: {},
    copyStates: {},
    canManageClaims: true,
    canCancelClaimInvitation: true,
    canCreateClaimInvitation: true,
    canManageHistoricalMembers: true,
    canManageHistoricalRoles: true,
    roleLabelForCode: (code) => code,
    normalizeInviteLink: (rawLink) => rawLink,
    onEditMember: vi.fn(),
    onDeleteMember: vi.fn(),
    onEditRole: vi.fn(),
    onDeleteRole: vi.fn(),
    onAddRole: vi.fn(),
    onVerifyClaim: vi.fn(),
    onRejectClaim: vi.fn(),
    onActivateMember: vi.fn(),
    onGenerateInvitation: vi.fn(),
    onCancelInvitation: vi.fn(),
    onCopyLink: vi.fn(),
    ...overrides,
  }
}

describe('GroupMembersHistTable claim-invite wiring', () => {
  it('renders the generate button for an unlinked member and calls onGenerateInvitation on click', () => {
    const onGenerateInvitation = vi.fn()
    render(<GroupMembersHistTable {...baseProps({ onGenerateInvitation })} />)

    const button = screen.getByRole('button', { name: 'Einladungslink generieren' })
    fireEvent.click(button)

    expect(onGenerateInvitation).toHaveBeenCalledWith(member.id, member.member_id)
  })

  it('does not render the generate button for a member already linked to an app account', () => {
    render(<GroupMembersHistTable {...baseProps({ members: [{ ...member, app_username: 'phase-admin' }] })} />)

    expect(screen.queryByRole('button', { name: 'Einladungslink generieren' })).toBeNull()
  })

  it('renders the invite link input and calls onCopyLink when a generated invite exists', () => {
    const onCopyLink = vi.fn()
    render(
      <GroupMembersHistTable
        {...baseProps({
          onCopyLink,
          generatedInvites: {
            [member.id]: {
              id: 7,
              member_id: member.member_id,
              fansub_group_id: 88,
              status: 'pending',
              expires_at: '2026-06-09T17:58:30.134384+02:00',
              invite_link: 'http://localhost:3002/claim-invitations/accept?token=abc123',
            },
          },
        })}
      />,
    )

    const input = screen.getByLabelText('Einladungslink für Phase Admin') as HTMLInputElement
    expect(input.value).toBe('http://localhost:3002/claim-invitations/accept?token=abc123')

    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }))
    expect(onCopyLink).toHaveBeenCalledWith(member.id, 'http://localhost:3002/claim-invitations/accept?token=abc123')
  })

  it('renders the active-invitation badge and calls onCancelInvitation when a pending invitation exists', () => {
    const onCancelInvitation = vi.fn()
    render(
      <GroupMembersHistTable
        {...baseProps({
          onCancelInvitation,
          memberInvitations: {
            [member.id]: [
              {
                id: 7,
                member_id: member.member_id,
                fansub_group_id: 88,
                status: 'pending',
                expires_at: '2026-06-09T17:58:30.134384+02:00',
                created_at: '2026-06-02T17:58:30.134384+02:00',
              },
            ],
          },
        })}
      />,
    )

    expect(screen.getByText(/Aktive Einladung bis/)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Zurückziehen' }))
    expect(onCancelInvitation).toHaveBeenCalledWith(member.id, member.member_id, 7)
  })
})
