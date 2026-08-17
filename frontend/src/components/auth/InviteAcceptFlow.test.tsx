// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { InviteAcceptFlowProps } from './InviteAcceptFlow'

const mocks = vi.hoisted(() => ({
  beginKeycloakLoginMock: vi.fn(),
  useAuthSessionMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}))

vi.mock('@/lib/keycloakAuth', () => ({
  beginKeycloakLogin: mocks.beginKeycloakLoginMock,
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: mocks.useAuthSessionMock,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.routerReplaceMock,
  }),
}))

import { InviteAcceptFlow } from './InviteAcceptFlow'

function authState(overrides: { isClientInitialized: boolean; hasAccessToken: boolean }) {
  return {
    authToken: '' as const,
    hasAccessToken: overrides.hasAccessToken,
    hasRefreshToken: false,
    displayName: '',
    isClientInitialized: overrides.isClientInitialized,
  }
}

function baseProps(overrides: Partial<InviteAcceptFlowProps> = {}): InviteAcceptFlowProps {
  return {
    token: 'invite-token-abc',
    title: 'Test-Einladung annehmen',
    description: 'Testbeschreibung.',
    loginPromptText: 'Bitte melde dich an oder registriere dich.',
    onAccept: vi.fn().mockResolvedValue(undefined),
    mapError: vi.fn(() => 'Zugeordnete Fehlermeldung.'),
    successMessage: 'Erfolgreich angenommen.',
    missingTokenText: 'Im Link fehlt ein gültiges Einladungs-Token.',
    ...overrides,
  }
}

describe('InviteAcceptFlow', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mocks.beginKeycloakLoginMock.mockReset()
    mocks.useAuthSessionMock.mockReset()
    mocks.routerReplaceMock.mockReset()
    window.history.replaceState({}, '', '/invitations/accept?token=invite-token-abc')
  })

  it('renders Anmelden and Registrieren for a logged-out invitee, forwarding returnPath and loginHint', async () => {
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: false }))

    render(<InviteAcceptFlow {...baseProps({ loginHintEmail: 'invitee@example.com' })} />)

    const loginButton = screen.getByRole('button', { name: 'Anmelden' })
    const registerButton = screen.getByRole('button', { name: 'Registrieren' })
    expect(loginButton).toBeTruthy()
    expect(registerButton).toBeTruthy()

    fireEvent.click(loginButton)
    await waitFor(() => {
      expect(mocks.beginKeycloakLoginMock).toHaveBeenCalledWith({
        returnPath: '/invitations/accept?token=invite-token-abc',
      })
    })

    fireEvent.click(registerButton)
    await waitFor(() => {
      expect(mocks.beginKeycloakLoginMock).toHaveBeenCalledWith({
        intent: 'register',
        returnPath: '/invitations/accept?token=invite-token-abc',
        loginHint: 'invitee@example.com',
      })
    })
  })

  it('renders missingTokenText and no action buttons when token is empty', () => {
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: false }))

    render(<InviteAcceptFlow {...baseProps({ token: '' })} />)

    expect(screen.getByText('Im Link fehlt ein gültiges Einladungs-Token.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Anmelden' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrieren' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Einladung annehmen' })).toBeNull()
  })

  it('auto-calls onAccept exactly once when hasAccessToken transitions to true, even across re-renders', async () => {
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: false }))
    const onAccept = vi.fn().mockResolvedValue(undefined)

    const { rerender } = render(<InviteAcceptFlow {...baseProps({ onAccept })} />)

    expect(onAccept).not.toHaveBeenCalled()

    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: true }))
    rerender(<InviteAcceptFlow {...baseProps({ onAccept })} />)

    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledTimes(1)
    })
    expect(onAccept).toHaveBeenCalledWith('invite-token-abc')

    rerender(<InviteAcceptFlow {...baseProps({ onAccept })} />)
    rerender(<InviteAcceptFlow {...baseProps({ onAccept })} />)

    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledTimes(1)
    })
  })

  it('renders the mapError(error) string when onAccept rejects', async () => {
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: true }))
    const failure = new Error('backend failure')
    const onAccept = vi.fn().mockRejectedValue(failure)
    const mapError = vi.fn(() => 'Freundliche Fehlermeldung.')

    render(<InviteAcceptFlow {...baseProps({ onAccept, mapError })} />)

    await waitFor(() => {
      expect(mapError).toHaveBeenCalledWith(failure)
      expect(screen.getByText('Freundliche Fehlermeldung.')).toBeTruthy()
    })
  })

  it('renders successMessage and redirects exactly once when onAccept resolves and afterAcceptRedirect is set', async () => {
    mocks.useAuthSessionMock.mockReturnValue(authState({ isClientInitialized: true, hasAccessToken: true }))
    const onAccept = vi.fn().mockResolvedValue(undefined)

    render(
      <InviteAcceptFlow
        {...baseProps({ onAccept, successMessage: 'Geschafft!', afterAcceptRedirect: '/me/profile' })}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Geschafft!')).toBeTruthy()
      expect(mocks.routerReplaceMock).toHaveBeenCalledTimes(1)
      expect(mocks.routerReplaceMock).toHaveBeenCalledWith('/me/profile')
    })
  })
})
