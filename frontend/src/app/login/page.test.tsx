// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routerMocks = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}))

const authMocks = vi.hoisted(() => ({
  beginKeycloakLoginMock: vi.fn(),
  completeKeycloakAuthCallbackMock: vi.fn(),
  getAuthSessionSnapshotMock: vi.fn(),
  logoutActiveAuthSessionMock: vi.fn(),
  isKeycloakEnabledMock: vi.fn(() => true),
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerMocks.replaceMock,
  }),
}))

vi.mock('@/lib/api', () => ({
  ApiError: authMocks.ApiError,
  completeKeycloakAuthCallback: authMocks.completeKeycloakAuthCallbackMock,
  getAuthSessionSnapshot: authMocks.getAuthSessionSnapshotMock,
  logoutActiveAuthSession: authMocks.logoutActiveAuthSessionMock,
}))

vi.mock('@/lib/keycloakAuth', () => ({
  beginKeycloakLogin: authMocks.beginKeycloakLoginMock,
  isKeycloakEnabled: authMocks.isKeycloakEnabledMock,
}))

import LoginPage from './page'

describe('LoginPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    routerMocks.replaceMock.mockReset()
    authMocks.beginKeycloakLoginMock.mockReset()
    authMocks.completeKeycloakAuthCallbackMock.mockReset()
    authMocks.getAuthSessionSnapshotMock.mockReset()
    authMocks.logoutActiveAuthSessionMock.mockReset()
    authMocks.isKeycloakEnabledMock.mockReset()
    window.history.replaceState({}, '', '/login')
    authMocks.getAuthSessionSnapshotMock.mockReturnValue({
      hasAccessToken: false,
      hasRefreshToken: false,
      displayName: '',
    })
    authMocks.isKeycloakEnabledMock.mockReturnValue(true)
    authMocks.beginKeycloakLoginMock.mockResolvedValue(undefined)
    authMocks.logoutActiveAuthSessionMock.mockResolvedValue(undefined)
    authMocks.completeKeycloakAuthCallbackMock.mockResolvedValue({
      data: {
        app_user_id: 1,
        display_name: 'Phase Admin',
      },
    })
  })

  it('starts Keycloak login from the member-facing login action', async () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Mit Keycloak anmelden' }))

    await waitFor(() => {
      expect(authMocks.beginKeycloakLoginMock).toHaveBeenCalledTimes(1)
    })
  })

  it('clears the active session and forces the identity prompt for relogin', async () => {
    authMocks.getAuthSessionSnapshotMock.mockReturnValue({
      hasAccessToken: true,
      hasRefreshToken: true,
      displayName: 'Phase Admin',
    })

    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Erneut anmelden' }))

    await waitFor(() => {
      expect(authMocks.logoutActiveAuthSessionMock).toHaveBeenCalledTimes(1)
      expect(authMocks.beginKeycloakLoginMock).toHaveBeenCalledWith({ prompt: 'login' })
    })
  })

  it('completes the Keycloak callback and continues to the profile', async () => {
    window.history.replaceState({}, '', '/login?code=abc&state=state-1')

    render(<LoginPage />)

    await waitFor(() => {
      expect(authMocks.completeKeycloakAuthCallbackMock).toHaveBeenCalledWith('abc', 'state-1')
      expect(routerMocks.replaceMock).toHaveBeenCalledWith('/me/profile')
    })
  })

  it('keeps the next path local before redirecting after callback', async () => {
    window.history.replaceState({}, '', '/login?code=abc&state=state-1&next=/admin')

    render(<LoginPage />)

    await waitFor(() => {
      expect(routerMocks.replaceMock).toHaveBeenCalledWith('/admin')
    })
  })

  it('clears stale Keycloak callback params after a failed code exchange', async () => {
    authMocks.completeKeycloakAuthCallbackMock.mockRejectedValueOnce(new Error('Keycloak-Code konnte nicht gegen Tokens getauscht werden.'))
    window.history.replaceState({}, '', '/login?code=used-code&state=state-1')

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByText('Keycloak-Code konnte nicht gegen Tokens getauscht werden.')).toBeTruthy()
      expect(window.location.pathname).toBe('/login')
      expect(window.location.search).toBe('')
    })
  })
})
