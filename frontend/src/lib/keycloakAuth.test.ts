// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('keycloakAuth refresh/logout browser paths', () => {
  const originalEnv = {
    enabled: process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED,
    baseUrl: process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL,
    realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM,
    clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED = 'true'
    process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL = 'http://localhost:8081'
    process.env.NEXT_PUBLIC_KEYCLOAK_REALM = 'team4s'
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID = 'team4s-frontend'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.resetModules()
    process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED = originalEnv.enabled
    process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL = originalEnv.baseUrl
    process.env.NEXT_PUBLIC_KEYCLOAK_REALM = originalEnv.realm
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID = originalEnv.clientId
  })

  it('refreshes through the same-origin Keycloak token proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'access-1',
        expires_in: 300,
        id_token: 'id-1',
        refresh_token: 'refresh-2',
        refresh_expires_in: 1800,
        token_type: 'Bearer',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { refreshKeycloakToken } = await import('./keycloakAuth')
    await expect(refreshKeycloakToken('refresh-1')).resolves.toMatchObject({
      idToken: 'id-1',
      refreshToken: 'refresh-2',
      tokenType: 'Bearer',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/keycloak/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: 'refresh-1',
        }),
      }),
    )
  })

  it('logs out directly against the browser-visible Keycloak logout endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const { logoutFromKeycloak } = await import('./keycloakAuth')
    await logoutFromKeycloak('refresh-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8081/realms/team4s/protocol/openid-connect/logout',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'client_id=team4s-frontend&refresh_token=refresh-1',
      }),
    )
  })
})
