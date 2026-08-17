// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  acceptClaimInvitationMock: vi.fn(),
  beginKeycloakLoginMock: vi.fn(),
  useAuthSessionMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(status: number, message: string, code: string | null = null) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

vi.mock('@/lib/api', () => ({
  acceptClaimInvitation: mocks.acceptClaimInvitationMock,
  ApiError: mocks.ApiError,
}))

vi.mock('@/lib/keycloakAuth', () => ({
  beginKeycloakLogin: mocks.beginKeycloakLoginMock,
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: mocks.useAuthSessionMock,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    replace: mocks.routerReplaceMock,
  }),
}))

import AcceptClaimInvitationPage from './page'

function authState(overrides: { isClientInitialized: boolean; hasAccessToken: boolean }) {
  return {
    authToken: '' as const,
    hasAccessToken: overrides.hasAccessToken,
    hasRefreshToken: false,
    displayName: '',
    isClientInitialized: overrides.isClientInitialized,
  }
}

describe('AcceptClaimInvitationPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mocks.acceptClaimInvitationMock.mockReset()
    mocks.beginKeycloakLoginMock.mockReset()
    mocks.useAuthSessionMock.mockReset()
    mocks.routerReplaceMock.mockReset()
    mocks.acceptClaimInvitationMock.mockResolvedValue(undefined)
  })

  it('shows the title "Member-Claim-Einladung annehmen"', () => {
    window.history.replaceState({}, '', '/claim-invitations/accept?token=abc123')
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: false }))

    render(<AcceptClaimInvitationPage />)

    expect(screen.getByText('Member-Claim-Einladung annehmen')).toBeTruthy()
  })

  it('calls beginKeycloakLogin with a returnPath containing the current token query string when clicking Anmelden while logged out', async () => {
    window.history.replaceState({}, '', '/claim-invitations/accept?token=abc123')
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: false }))

    render(<AcceptClaimInvitationPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))

    await waitFor(() => {
      expect(mocks.beginKeycloakLoginMock).toHaveBeenCalledWith(
        expect.objectContaining({ returnPath: expect.stringContaining('token=abc123') }),
      )
    })
  })

  it('calls acceptClaimInvitation with {token} and redirects to /me/profile on success when logged in', async () => {
    window.history.replaceState({}, '', '/claim-invitations/accept?token=abc123')
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: true }))

    render(<AcceptClaimInvitationPage />)

    await waitFor(() => {
      expect(mocks.acceptClaimInvitationMock).toHaveBeenCalledWith({ token: 'abc123' })
      expect(mocks.routerReplaceMock).toHaveBeenCalledWith('/me/profile')
    })
  })
})
