// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const approveMemberRequest = vi.fn()
const cancelClaimInvitation = vi.fn()
const generateClaimInvitation = vi.fn()
const listClaimInvitations = vi.fn()
const listGroupMembers = vi.fn()
const listMemberRequests = vi.fn()
const listPendingMemberClaims = vi.fn()
const rejectMemberClaim = vi.fn()
const rejectMemberRequest = vi.fn()
const verifyMemberClaim = vi.fn()

vi.mock('@/lib/api', () => ({
  approveMemberRequest: (...args: unknown[]) => approveMemberRequest(...args),
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(status: number, message: string, retryAfterSeconds: number | null = null, code: string | null = null) {
      super(message)
      this.status = status
      this.code = code
    }
  },
  cancelClaimInvitation: (...args: unknown[]) => cancelClaimInvitation(...args),
  generateClaimInvitation: (...args: unknown[]) => generateClaimInvitation(...args),
  listClaimInvitations: (...args: unknown[]) => listClaimInvitations(...args),
  listGroupMembers: (...args: unknown[]) => listGroupMembers(...args),
  listMemberRequests: (...args: unknown[]) => listMemberRequests(...args),
  listPendingMemberClaims: (...args: unknown[]) => listPendingMemberClaims(...args),
  rejectMemberClaim: (...args: unknown[]) => rejectMemberClaim(...args),
  rejectMemberRequest: (...args: unknown[]) => rejectMemberRequest(...args),
  verifyMemberClaim: (...args: unknown[]) => verifyMemberClaim(...args),
}))

import { ClaimManagementPanel } from './ClaimManagementPanel'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ClaimManagementPanel', () => {
  it('generates claim invitations with the canonical member_id and copies the visible local link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    listGroupMembers.mockResolvedValue({
      data: [
        {
          id: 12,
          fansub_group_id: 88,
          member_id: 2,
          display_name: 'Phase Admin',
          joined_year: 2005,
          left_year: null,
          app_user_id: 1,
          app_username: null,
          status: 'confirmed',
          created_at: '2026-06-02T17:58:30.134384+02:00',
        },
      ],
    })
    listClaimInvitations.mockResolvedValue([])
    listPendingMemberClaims.mockResolvedValue([])
    listMemberRequests.mockResolvedValue([])
    generateClaimInvitation.mockResolvedValue({
      id: 7,
      member_id: 2,
      fansub_group_id: 88,
      status: 'pending',
      expires_at: '2026-06-09T17:58:30.134384+02:00',
      invite_link: 'http://localhost:3002/claim-invitations/accept?token=abc123',
    })

    render(<ClaimManagementPanel groupId={88} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Einladungslink generieren' }))

    await waitFor(() => {
      expect(generateClaimInvitation).toHaveBeenCalledWith(88, 2)
    })
    expect(generateClaimInvitation).not.toHaveBeenCalledWith(88, 12)

    const visibleLink = `${window.location.origin}/claim-invitations/accept?token=abc123`
    expect(await screen.findByDisplayValue(visibleLink)).not.toBeNull()
    const openLink = screen.getByRole('link', { name: 'Öffnen' })
    expect(openLink.getAttribute('href')).toBe(visibleLink)
    expect(openLink.getAttribute('target')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(visibleLink)
    })
    expect(await screen.findByText('Kopiert!')).not.toBeNull()
  })

  it('selects the visible invite link when browser clipboard access is blocked', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard blocked'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    listGroupMembers.mockResolvedValue({
      data: [
        {
          id: 12,
          fansub_group_id: 88,
          member_id: 2,
          display_name: 'Phase Admin',
          joined_year: 2005,
          left_year: null,
          app_user_id: 1,
          app_username: null,
          status: 'confirmed',
          created_at: '2026-06-02T17:58:30.134384+02:00',
        },
      ],
    })
    listClaimInvitations.mockResolvedValue([])
    listPendingMemberClaims.mockResolvedValue([])
    listMemberRequests.mockResolvedValue([])
    generateClaimInvitation.mockResolvedValue({
      id: 7,
      member_id: 2,
      fansub_group_id: 88,
      status: 'pending',
      expires_at: '2026-06-09T17:58:30.134384+02:00',
      invite_link: '/claim-invitations/accept?token=abc123',
    })

    render(<ClaimManagementPanel groupId={88} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Einladungslink generieren' }))
    const input = await screen.findByLabelText('Einladungslink für Phase Admin') as HTMLInputElement
    const selectSpy = vi.spyOn(input, 'select')

    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }))

    await waitFor(() => {
      expect(selectSpy).toHaveBeenCalled()
    })
    expect(await screen.findByText('Link markiert')).not.toBeNull()
    expect(await screen.findByText(/Der Link ist markiert/)).not.toBeNull()
  })

  it('lets leaders cancel an active invitation when the original link is no longer available', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    listGroupMembers.mockResolvedValue({
      data: [
        {
          id: 12,
          fansub_group_id: 88,
          member_id: 2,
          display_name: 'Phase Admin',
          joined_year: 2005,
          left_year: null,
          app_user_id: 1,
          app_username: null,
          status: 'confirmed',
          created_at: '2026-06-02T17:58:30.134384+02:00',
        },
      ],
    })
    listClaimInvitations.mockResolvedValue([
      {
        id: 7,
        member_id: 2,
        fansub_group_id: 88,
        status: 'pending',
        expires_at: '2026-06-09T17:58:30.134384+02:00',
        created_at: '2026-06-02T17:58:30.134384+02:00',
      },
    ])
    listPendingMemberClaims.mockResolvedValue([])
    listMemberRequests.mockResolvedValue([])
    cancelClaimInvitation.mockResolvedValue(undefined)

    render(<ClaimManagementPanel groupId={88} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Aktive Einladung zurückziehen' }))

    await waitFor(() => {
      expect(cancelClaimInvitation).toHaveBeenCalledWith(88, 2, 7)
    })
    expect(await screen.findByText('Aktive Einladung zurückgezogen. Du kannst jetzt einen neuen Link generieren.')).not.toBeNull()
  })
})
