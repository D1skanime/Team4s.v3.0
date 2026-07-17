// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function createMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

function stubBrowserGlobals(memoryStorage: ReturnType<typeof createMemoryStorage>) {
  const assignMock = vi.fn()
  vi.stubGlobal('window', {
    location: {
      origin: 'http://localhost:3000',
      assign: assignMock,
    },
  })
  vi.stubGlobal('sessionStorage', memoryStorage)
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
  return assignMock
}

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
    const memoryStorage = createMemoryStorage()
    const assignMock = stubBrowserGlobals(memoryStorage)

    const { beginKeycloakLogin } = await import('./keycloakAuth')
    await beginKeycloakLogin({ prompt: 'login' })

    expect(assignMock).toHaveBeenCalledTimes(1)
    const authURL = new URL(assignMock.mock.calls[0][0])
    expect(authURL.searchParams.get('prompt')).toBe('login')
    expect(authURL.searchParams.get('client_id')).toBe('team4s-frontend')
  })
})

describe('keycloakAuth registration intent and one-shot completion marker', () => {
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

  it('starts an ordinary login on the authorization endpoint', async () => {
    const memoryStorage = createMemoryStorage()
    const assignMock = stubBrowserGlobals(memoryStorage)

    const { beginKeycloakLogin } = await import('./keycloakAuth')
    await beginKeycloakLogin()

    const authURL = new URL(assignMock.mock.calls[0][0])
    expect(authURL.pathname).toContain('/protocol/openid-connect/auth')
    expect(authURL.pathname).not.toContain('/registrations')
  })

  it('starts registration on the dedicated Keycloak registrations endpoint with the same PKCE parameters', async () => {
    const memoryStorage = createMemoryStorage()
    const assignMock = stubBrowserGlobals(memoryStorage)

    const { beginKeycloakLogin } = await import('./keycloakAuth')
    await beginKeycloakLogin({ intent: 'register' })

    const authURL = new URL(assignMock.mock.calls[0][0])
    expect(authURL.pathname).toContain('/protocol/openid-connect/registrations')
    expect(authURL.searchParams.get('client_id')).toBe('team4s-frontend')
    expect(authURL.searchParams.get('response_type')).toBe('code')
    expect(authURL.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authURL.searchParams.get('code_challenge')).toBeTruthy()
    expect(authURL.searchParams.get('state')).toBeTruthy()
  })

  it('creates the one-shot completion marker only after a validated registration callback', async () => {
    const memoryStorage = createMemoryStorage()
    stubBrowserGlobals(memoryStorage)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'access-1',
          expires_in: 300,
          id_token: 'id-1',
          refresh_token: 'refresh-1',
          refresh_expires_in: 1800,
          token_type: 'Bearer',
        }),
      }),
    )

    const { beginKeycloakLogin, exchangeKeycloakCode } = await import('./keycloakAuth')
    const { hasPendingRegistrationCompletion } = await import('./registrationCompletion')

    await beginKeycloakLogin({ intent: 'register' })
    const usedState = memoryStorage.getItem('team4s.keycloak.pkce_state') as string

    expect(hasPendingRegistrationCompletion()).toBe(false)
    await exchangeKeycloakCode('the-code', usedState)
    expect(hasPendingRegistrationCompletion()).toBe(true)
  })

  it('does not create the marker for an ordinary login callback', async () => {
    const memoryStorage = createMemoryStorage()
    stubBrowserGlobals(memoryStorage)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'access-1',
          expires_in: 300,
          id_token: 'id-1',
          refresh_token: 'refresh-1',
          refresh_expires_in: 1800,
          token_type: 'Bearer',
        }),
      }),
    )

    const { beginKeycloakLogin, exchangeKeycloakCode } = await import('./keycloakAuth')
    const { hasPendingRegistrationCompletion } = await import('./registrationCompletion')

    await beginKeycloakLogin()
    const usedState = memoryStorage.getItem('team4s.keycloak.pkce_state') as string

    await exchangeKeycloakCode('the-code', usedState)
    expect(hasPendingRegistrationCompletion()).toBe(false)
  })

  it('rejects a spoofed/mismatched state and clears any stale completion marker', async () => {
    const memoryStorage = createMemoryStorage()
    stubBrowserGlobals(memoryStorage)

    const { beginKeycloakLogin, exchangeKeycloakCode } = await import('./keycloakAuth')
    const { hasPendingRegistrationCompletion, markRegistrationCompleted } = await import('./registrationCompletion')

    await beginKeycloakLogin({ intent: 'register' })
    // Simulate a marker left behind by an unrelated, never-consumed prior attempt.
    markRegistrationCompleted()

    await expect(exchangeKeycloakCode('the-code', 'attacker-controlled-state')).rejects.toThrow(
      'Der Keycloak-Loginstatus ist abgelaufen oder ungültig.',
    )
    expect(hasPendingRegistrationCompletion()).toBe(false)
  })

  it('rejects replaying an already-consumed code/state pair', async () => {
    const memoryStorage = createMemoryStorage()
    stubBrowserGlobals(memoryStorage)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'access-1',
          expires_in: 300,
          id_token: 'id-1',
          refresh_token: 'refresh-1',
          refresh_expires_in: 1800,
          token_type: 'Bearer',
        }),
      }),
    )

    const { beginKeycloakLogin, exchangeKeycloakCode } = await import('./keycloakAuth')

    await beginKeycloakLogin()
    const usedState = memoryStorage.getItem('team4s.keycloak.pkce_state') as string

    await exchangeKeycloakCode('the-code', usedState)
    await expect(exchangeKeycloakCode('the-code', usedState)).rejects.toThrow(
      'Der Keycloak-Loginstatus ist abgelaufen oder ungültig.',
    )
  })

  it('clears a stale completion marker when the token exchange itself fails', async () => {
    const memoryStorage = createMemoryStorage()
    stubBrowserGlobals(memoryStorage)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { beginKeycloakLogin, exchangeKeycloakCode } = await import('./keycloakAuth')
    const { hasPendingRegistrationCompletion, markRegistrationCompleted } = await import('./registrationCompletion')

    await beginKeycloakLogin({ intent: 'register' })
    const usedState = memoryStorage.getItem('team4s.keycloak.pkce_state') as string
    markRegistrationCompleted()

    await expect(exchangeKeycloakCode('the-code', usedState)).rejects.toThrow(
      'Keycloak-Code konnte nicht gegen Tokens getauscht werden.',
    )
    expect(hasPendingRegistrationCompletion()).toBe(false)
  })
})
