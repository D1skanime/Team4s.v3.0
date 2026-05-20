// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  clearAuthSessionMock: vi.fn(),
  completeKeycloakAuthCallbackMock: vi.fn(),
  getAuthSessionSnapshotMock: vi.fn(),
  getRuntimeDisplayNameMock: vi.fn(),
  logoutActiveAuthSessionMock: vi.fn(),
  persistResolvedAuthSessionMock: vi.fn(),
  refreshActiveAuthSessionMock: vi.fn(),
  resolveCurrentUserFromAuthSessionMock: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/api', () => ({
  ApiError: authMocks.ApiError,
  clearAuthSession: authMocks.clearAuthSessionMock,
  completeKeycloakAuthCallback: authMocks.completeKeycloakAuthCallbackMock,
  getAuthSessionSnapshot: authMocks.getAuthSessionSnapshotMock,
  getRuntimeDisplayName: authMocks.getRuntimeDisplayNameMock,
  issueAuthToken: vi.fn(),
  logoutActiveAuthSession: authMocks.logoutActiveAuthSessionMock,
  persistResolvedAuthSession: authMocks.persistResolvedAuthSessionMock,
  refreshActiveAuthSession: authMocks.refreshActiveAuthSessionMock,
  resolveCurrentUserFromAuthSession: authMocks.resolveCurrentUserFromAuthSessionMock,
}))

vi.mock('@/lib/keycloakAuth', () => ({
  beginKeycloakLogin: vi.fn(),
  exchangeKeycloakCode: vi.fn(),
  isKeycloakEnabled: vi.fn(() => true),
  logoutFromKeycloak: vi.fn(),
  refreshKeycloakToken: vi.fn(),
}))

import AuthPage from './page'

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.getAuthSessionSnapshotMock.mockReturnValue({
      hasAccessToken: true,
      hasRefreshToken: true,
      displayName: 'Phase Admin',
    })
    authMocks.getRuntimeDisplayNameMock.mockReturnValue('Phase Admin')
    authMocks.resolveCurrentUserFromAuthSessionMock.mockResolvedValue({
      data: {
        app_user_id: 1,
        legacy_user_id: 1,
        display_name: 'Phase Admin',
        email: 'phase43-admin@example.local',
        keycloak_subject: 'kc-1',
        session_id: 'session-1',
        status: 'active',
        is_platform_admin: true,
        global_roles: ['platform_admin'],
      },
    })
  })

  it('resolves the current user once for an existing runtime token', async () => {
    render(<AuthPage />)

    await waitFor(() => {
      expect(authMocks.resolveCurrentUserFromAuthSessionMock).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Phase Admin')).not.toBeNull()
  })

})
