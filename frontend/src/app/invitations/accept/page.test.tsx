// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  acceptFansubInvitationMock: vi.fn(),
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
  acceptFansubInvitation: mocks.acceptFansubInvitationMock,
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

import AcceptInvitationPage from './page'

function authState(overrides: { isClientInitialized: boolean; hasAccessToken: boolean }) {
  return {
    authToken: '' as const,
    hasAccessToken: overrides.hasAccessToken,
    hasRefreshToken: false,
    displayName: '',
    isClientInitialized: overrides.isClientInitialized,
  }
}

describe('AcceptInvitationPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mocks.acceptFansubInvitationMock.mockReset()
    mocks.beginKeycloakLoginMock.mockReset()
    mocks.useAuthSessionMock.mockReset()
    mocks.routerReplaceMock.mockReset()
    mocks.acceptFansubInvitationMock.mockResolvedValue({ data: { accepted: true, fansub_group_id: 1 } })
  })

  it('shows the title "Fansub-Einladung annehmen"', () => {
    window.history.replaceState({}, '', '/invitations/accept?token=abc123')
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: false }))

    render(<AcceptInvitationPage />)

    expect(screen.getByText('Fansub-Einladung annehmen')).toBeTruthy()
  })

  it('forwards the email search param as loginHint when clicking Registrieren while logged out', async () => {
    window.history.replaceState({}, '', '/invitations/accept?token=abc123&email=invitee%40example.com')
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: false }))

    render(<AcceptInvitationPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }))

    await waitFor(() => {
      expect(mocks.beginKeycloakLoginMock).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'register', loginHint: 'invitee@example.com' }),
      )
    })
  })

  it('calls acceptFansubInvitation with the trimmed token when logged in', async () => {
    window.history.replaceState({}, '', '/invitations/accept?token=%20abc123%20')
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: true }))

    render(<AcceptInvitationPage />)

    await waitFor(() => {
      expect(mocks.acceptFansubInvitationMock).toHaveBeenCalledWith({ token: 'abc123' })
    })
  })

  it('renders the mapped friendly message for an invitation_expired ApiError instead of the raw message', async () => {
    window.history.replaceState({}, '', '/invitations/accept?token=abc123')
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: true }))
    mocks.acceptFansubInvitationMock.mockRejectedValue(
      new mocks.ApiError(410, 'raw backend message', 'invitation_expired'),
    )

    render(<AcceptInvitationPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Dieser Einladungslink ist abgelaufen. Bitte die Gruppenleitung, einen neuen Link zu erstellen.'),
      ).toBeTruthy()
      expect(screen.queryByText('raw backend message')).toBeNull()
    })
  })
})
