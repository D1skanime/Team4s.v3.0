// @vitest-environment node

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

  it('logs out through the same-origin Keycloak logout proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const { logoutFromKeycloak } = await import('./keycloakAuth')
    await logoutFromKeycloak('refresh-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/keycloak/logout',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: 'refresh-1',
        }),
      }),
    )
  })

  it('can force the Keycloak login identity prompt', async () => {
    const assignMock = vi.fn()
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:3000',
        assign: assignMock,
      },
    })
    vi.stubGlobal('sessionStorage', {
      setItem: vi.fn(),
    })
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(1)
        return bytes
      },
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
      },
    })
    vi.stubGlobal('btoa', (value: string) => Buffer.from(value, 'binary').toString('base64'))

    const { beginKeycloakLogin } = await import('./keycloakAuth')
    await beginKeycloakLogin({ prompt: 'login' })

    expect(assignMock).toHaveBeenCalledTimes(1)
    const authURL = new URL(assignMock.mock.calls[0][0])
    expect(authURL.searchParams.get('prompt')).toBe('login')
    expect(authURL.searchParams.get('client_id')).toBe('team4s-frontend')
  })
})
