// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refreshKeycloakTokenMock = vi.fn()

vi.mock('@/lib/keycloakAuth', () => ({
  isKeycloakEnabled: () => true,
  refreshKeycloakToken: (...args: unknown[]) => refreshKeycloakTokenMock(...args),
}))

import {
  ApiError,
  clearAuthSession,
  createFansubGroup,
  getEpisodeImportContext,
  getAuthSessionSnapshot,
  getReleaseVersionMedia,
  persistAuthSession,
  uploadAdminAnimeMedia,
} from './api'

function makeResponse(body: unknown, init: { ok: boolean; status: number }) {
  return {
    ok: init.ok,
    status: init.status,
    json: vi.fn().mockResolvedValue(body),
    clone() {
      return makeResponse(body, init)
    },
  }
}

function seedRuntimeSession(): void {
  const nowSeconds = Math.floor(Date.now() / 1000)
  persistAuthSession({
    token_type: 'Bearer',
    access_token: 'stale-access-token',
    access_token_expires_at: nowSeconds + 3600,
    access_token_expires_in: 3600,
    refresh_token: 'refresh-token-1',
    refresh_token_expires_at: nowSeconds + 7200,
    refresh_token_expires_in: 7200,
    user_id: 7,
    display_name: 'Phase Admin',
  })
}

function seedRuntimeSessionExpiringSoon(): void {
  const nowSeconds = Math.floor(Date.now() / 1000)
  persistAuthSession({
    token_type: 'Bearer',
    access_token: 'nearly-expired-access-token',
    access_token_expires_at: nowSeconds + 20,
    access_token_expires_in: 20,
    refresh_token: 'refresh-token-1',
    refresh_token_expires_at: nowSeconds + 7200,
    refresh_token_expires_in: 7200,
    user_id: 7,
    app_user_id: 11,
    display_name: 'Phase Admin',
    session_id: 'session-11',
  })
}

function freshKeycloakBundle() {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return {
    accessToken: 'new-access-token',
    accessTokenExpiresAt: nowSeconds + 3600,
    accessTokenExpiresIn: 3600,
    idToken: 'fresh-id-token',
    refreshToken: 'fresh-refresh-token',
    refreshTokenExpiresAt: nowSeconds + 7200,
    refreshTokenExpiresIn: 7200,
    tokenType: 'Bearer' as const,
  }
}

function makeCurrentUserResponse() {
  return makeResponse({
    data: {
      app_user_id: 7,
      legacy_user_id: 7,
      display_name: 'Phase Admin',
      email: 'phase43-admin@example.local',
      keycloak_subject: 'kc-7',
      status: 'active',
      global_roles: ['platform_admin'],
      is_platform_admin: true,
      session_id: 'session-7',
    },
  }, { ok: true, status: 200 })
}

function readCookie(name: string): string {
  const prefix = `${name}=`
  const match = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : ''
}

describe('authorized auth refresh flow', () => {
  beforeEach(() => {
    seedRuntimeSession()
  })

  afterEach(() => {
    clearAuthSession()
    refreshKeycloakTokenMock.mockReset()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps successful protected requests on the first token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' } }, { ok: true, status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getEpisodeImportContext(15)).resolves.toEqual({
      data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/anime/15/episode-import/context'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer stale-access-token',
        }),
      }),
    )
    expect(refreshKeycloakTokenMock).not.toHaveBeenCalled()
  })

  it('keeps expiry metadata private in the UI session snapshot', () => {
    const snapshot = getAuthSessionSnapshot() as unknown as Record<string, unknown>

    expect(snapshot.hasAccessToken).toBe(true)
    expect(snapshot.hasRefreshToken).toBe(true)
    expect(snapshot.displayName).toBe('Phase Admin')
    expect(snapshot.access_token).toBeUndefined()
    expect(snapshot.refresh_token).toBeUndefined()
    expect(snapshot.access_token_expires_at).toBeUndefined()
    expect(snapshot.refresh_token_expires_at).toBeUndefined()
  })

  it('refreshes proactively before a protected request when the access token is near expiry', async () => {
    seedRuntimeSessionExpiringSoon()
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeCurrentUserResponse())
      .mockResolvedValueOnce(
        makeResponse({ data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' } }, { ok: true, status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getEpisodeImportContext(15)).resolves.toEqual({
      data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' },
    })

    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access-token',
        }),
      }),
    )
  })

  it('shares one proactive refresh across concurrent protected requests', async () => {
    seedRuntimeSessionExpiringSoon()
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/me')) {
        return Promise.resolve(makeCurrentUserResponse())
      }
      if (url.includes('/episode-import/context')) {
        return Promise.resolve(makeResponse({ data: { anisearch_id: '1078' } }, { ok: true, status: 200 }))
      }
      return Promise.resolve(makeResponse({ data: { id: 55, name: 'AnimeMiako' } }, { ok: true, status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([
      getEpisodeImportContext(15),
      createFansubGroup({ name: 'AnimeMiako', slug: 'animemiako', status: 'active', group_type: 'group' }),
    ])

    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('prefers the current browser runtime token over a stale explicit token', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    persistAuthSession({
      token_type: 'Bearer',
      access_token: 'fresh-runtime-token',
      access_token_expires_at: nowSeconds + 3600,
      access_token_expires_in: 3600,
      refresh_token: 'refresh-token-2',
      refresh_token_expires_at: nowSeconds + 7200,
      refresh_token_expires_in: 7200,
      user_id: 7,
      app_user_id: 11,
      display_name: 'Phase Admin',
      session_id: 'session-11',
    })

    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' } }, { ok: true, status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getEpisodeImportContext(15, 'stale-explicit-token')).resolves.toEqual({
      data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/anime/15/episode-import/context'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-runtime-token',
        }),
      }),
    )
  })

  it('refreshes once and retries the original request after a 401 token failure', async () => {
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        makeResponse({ error: { message: 'ungueltiges zugriffstoken' } }, { ok: false, status: 401 }),
      )
      .mockResolvedValueOnce(
        makeCurrentUserResponse(),
      )
      .mockResolvedValueOnce(
        makeResponse({ data: { id: 55, name: 'AnimeMiako', slug: 'animemiako', status: 'active', group_type: 'group' } }, { ok: true, status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(createFansubGroup({ name: 'AnimeMiako', slug: 'animemiako', status: 'active', group_type: 'group' })).resolves.toEqual({
      data: { id: 55, name: 'AnimeMiako', slug: 'animemiako', status: 'active', group_type: 'group' },
    })

    expect(refreshKeycloakTokenMock).toHaveBeenCalledWith('refresh-token-1')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access-token',
        }),
      }),
    )
    expect(readCookie('team4s_access_token')).toBe('new-access-token')
    expect(readCookie('team4s_refresh_token')).toBe('fresh-refresh-token')
    expect(window.localStorage.getItem('team4s.auth.access_token')).toBeNull()
    expect(window.localStorage.getItem('team4s.auth.refresh_token')).toBeNull()
  })

  it('refreshes and retries release-version media requests after token expiry', async () => {
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        makeResponse({ error: { message: 'ungueltiges zugriffstoken' } }, { ok: false, status: 401 }),
      )
      .mockResolvedValueOnce(
        makeCurrentUserResponse(),
      )
      .mockResolvedValueOnce(
        makeResponse({ data: [] }, { ok: true, status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getReleaseVersionMedia(42)).resolves.toEqual({ data: [] })

    expect(refreshKeycloakTokenMock).toHaveBeenCalledWith('refresh-token-1')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2]?.[0]).toEqual(
      expect.stringContaining('/api/v1/admin/release-versions/42/media'),
    )
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access-token',
        }),
      }),
    )
  })

  it('clears the local session when refresh fails', async () => {
    refreshKeycloakTokenMock.mockRejectedValue(new Error('Keycloak-Session konnte nicht aktualisiert werden.'))
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ error: { message: 'ungueltiges zugriffstoken' } }, { ok: false, status: 401 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getEpisodeImportContext(15)).rejects.toMatchObject({
      status: 401,
      message: 'Keycloak-Session konnte nicht aktualisiert werden.',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem('team4s.auth.access_token')).toBeNull()
    expect(window.localStorage.getItem('team4s.auth.refresh_token')).toBeNull()
  })

  it('retries a mutation at most once before surfacing the second 401', async () => {
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        makeResponse({ error: { message: 'ungueltiges zugriffstoken' } }, { ok: false, status: 401 }),
      )
      .mockResolvedValueOnce(
        makeCurrentUserResponse(),
      )
      .mockResolvedValueOnce(
        makeResponse({ error: { message: 'ungueltiges zugriffstoken' } }, { ok: false, status: 401 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createFansubGroup({ name: 'AnimeMiako', slug: 'animemiako', status: 'active', group_type: 'group' }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
  })

  it('does not automatically replay unsafe upload requests after an upload 401', async () => {
    class MockUploadXhr {
      static instances: MockUploadXhr[] = []
      status = 401
      responseText = JSON.stringify({ error: { message: 'ungueltiges zugriffstoken' } })
      upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      headers: Record<string, string> = {}

      constructor() {
        MockUploadXhr.instances.push(this)
      }

      open() {}

      setRequestHeader(name: string, value: string) {
        this.headers[name] = value
      }

      send() {
        this.onload?.()
      }
    }

    vi.stubGlobal('XMLHttpRequest', MockUploadXhr)

    await expect(uploadAdminAnimeMedia({
      animeID: 15,
      assetType: 'poster',
      file: new File(['avatar'], 'avatar.png', { type: 'image/png' }),
      authToken: 'stale-page-owned-token',
    })).rejects.toMatchObject({
      status: 401,
      message: 'Anmeldung abgelaufen. Bitte erneut anmelden und den Upload wiederholen.',
    })

    expect(MockUploadXhr.instances).toHaveLength(1)
    expect(MockUploadXhr.instances[0]?.headers.Authorization).toBe('Bearer stale-access-token')
    expect(refreshKeycloakTokenMock).not.toHaveBeenCalled()
  })

  it('preflights upload auth with refresh and preserves progress callbacks', async () => {
    seedRuntimeSessionExpiringSoon()
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())

    const fetchMock = vi.fn().mockResolvedValue(makeCurrentUserResponse())
    vi.stubGlobal('fetch', fetchMock)

    class MockUploadXhr {
      static instances: MockUploadXhr[] = []
      status = 0
      responseText = ''
      upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      headers: Record<string, string> = {}

      constructor() {
        MockUploadXhr.instances.push(this)
      }

      open() {}

      setRequestHeader(name: string, value: string) {
        this.headers[name] = value
      }

      send() {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 } as ProgressEvent)
        this.status = 201
        this.responseText = JSON.stringify({
          id: 'media-42',
          status: 'completed',
          url: '/media/anime/15/poster/media-42/original.png',
          files: [],
        })
        this.onload?.()
      }
    }

    vi.stubGlobal('XMLHttpRequest', MockUploadXhr)
    const progress: number[] = []

    await expect(uploadAdminAnimeMedia({
      animeID: 15,
      assetType: 'poster',
      file: new File(['poster'], 'poster.png', { type: 'image/png' }),
      onProgress: (percent) => progress.push(percent),
    })).resolves.toMatchObject({ id: 'media-42' })

    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access-token',
        }),
      }),
    )
    expect(MockUploadXhr.instances).toHaveLength(1)
    expect(MockUploadXhr.instances[0]?.headers.Authorization).toBe('Bearer new-access-token')
    expect(progress).toEqual([0, 25, 100])
  })

  it('rejects unsafe uploads before opening XHR when preflight refresh fails', async () => {
    seedRuntimeSessionExpiringSoon()
    refreshKeycloakTokenMock.mockRejectedValue(new Error('Keycloak-Session konnte nicht aktualisiert werden.'))

    class MockUploadXhr {
      static instances: MockUploadXhr[] = []

      constructor() {
        MockUploadXhr.instances.push(this)
      }
    }

    vi.stubGlobal('XMLHttpRequest', MockUploadXhr)

    await expect(uploadAdminAnimeMedia({
      animeID: 15,
      assetType: 'poster',
      file: new File(['poster'], 'poster.png', { type: 'image/png' }),
    })).rejects.toMatchObject({
      status: 401,
      message: 'Keycloak-Session konnte nicht aktualisiert werden.',
    })

    expect(MockUploadXhr.instances).toHaveLength(0)
    expect(window.localStorage.getItem('team4s.auth.access_token')).toBeNull()
    expect(window.localStorage.getItem('team4s.auth.refresh_token')).toBeNull()
  })
})
