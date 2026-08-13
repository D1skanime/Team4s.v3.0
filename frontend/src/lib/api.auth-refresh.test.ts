// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refreshKeycloakTokenMock = vi.fn()
const logoutFromKeycloakMock = vi.fn()

vi.mock('@/lib/keycloakAuth', () => ({
  isKeycloakEnabled: () => true,
  logoutFromKeycloak: (...args: unknown[]) => logoutFromKeycloakMock(...args),
  refreshKeycloakToken: (...args: unknown[]) => refreshKeycloakTokenMock(...args),
}))

import {
  ApiError,
  AUTH_DISPLAY_NAME_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  AUTH_TOKEN_COOKIE_NAME,
  clearAuthSession,
  confirmAnimeContribution,
  confirmProposal,
  createFansubGroup,
  getEpisodeImportContext,
  getAuthSessionSnapshot,
  getMemberContributions,
  getMemberProfile,
  getReleaseVersionMedia,
  getReleasePlaybackAccess,
  getProjectMemberSummary,
  logoutActiveAuthSession,
  persistAuthSession,
  replaceReleaseCrew,
  upsertAnimeFansubProjectNote,
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

function seedRuntimeSessionMissingAccessToken(): void {
  const nowSeconds = Math.floor(Date.now() / 1000)
  persistAuthSession({
    token_type: 'Bearer',
    access_token: '',
    access_token_expires_at: 0,
    access_token_expires_in: 0,
    refresh_token: 'refresh-token-1',
    refresh_token_expires_at: nowSeconds + 7200,
    refresh_token_expires_in: 7200,
    user_id: 7,
    app_user_id: 11,
    display_name: 'Phase Admin',
    session_id: 'session-11',
  })
}

function seedRuntimeSessionExpiredAccessToken(): void {
  const nowSeconds = Math.floor(Date.now() / 1000)
  persistAuthSession({
    token_type: 'Bearer',
    access_token: 'expired-access-token',
    // access_token_expires_at is already in the past even though the cookie's
    // own Max-Age keeps it briefly readable — shouldRefreshRuntimeSession must
    // decide on the recorded expiry, not on whether the cookie is still present.
    access_token_expires_at: nowSeconds - 120,
    access_token_expires_in: 300,
    refresh_token: 'refresh-token-1',
    refresh_token_expires_at: nowSeconds + 7200,
    refresh_token_expires_in: 7200,
    user_id: 7,
    app_user_id: 11,
    display_name: 'Phase Admin',
    session_id: 'session-11',
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

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const apiSource = fs.readFileSync(path.join(currentDir, 'api.ts'), 'utf8')

function exportedFunctionSource(name: string): string {
  const marker = `export async function ${name}(`
  const start = apiSource.indexOf(marker)
  expect(start, `${name} must remain exported from api.ts`).toBeGreaterThanOrEqual(0)
  const nextExport = apiSource.indexOf('\nexport ', start + marker.length)
  return apiSource.slice(start, nextExport === -1 ? apiSource.length : nextExport)
}

describe('authorized auth refresh flow', () => {
  beforeEach(() => {
    seedRuntimeSession()
  })

  afterEach(() => {
    clearAuthSession()
    logoutFromKeycloakMock.mockReset()
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

  it('retries an idempotent request once after a transient network failure', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        makeResponse({ data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' } }, { ok: true, status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getEpisodeImportContext(15)).resolves.toEqual({
      data: { anisearch_id: '1078', jellyfin_series_id: 'bleach' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
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

  it('D-20: keeps a missing access token with a valid refresh token an active session that refreshes only through api.ts', async () => {
    seedRuntimeSessionMissingAccessToken()

    // Missing access token alone must not be read as "logged out": the refresh
    // token is what keeps the session active per D-20.
    const preRefreshSnapshot = getAuthSessionSnapshot()
    expect(preRefreshSnapshot.hasAccessToken).toBe(false)
    expect(preRefreshSnapshot.hasRefreshToken).toBe(true)

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

    // Proactive refresh only — no 401 round-trip was needed since the missing
    // token was caught before the request was ever sent.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
    expect(refreshKeycloakTokenMock).toHaveBeenCalledWith('refresh-token-1')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access-token',
        }),
      }),
    )
    expect(getAuthSessionSnapshot()).toMatchObject({ hasAccessToken: true, hasRefreshToken: true })
  })

  it('D-20: keeps an already-expired access token with a valid refresh token an active session that refreshes only through api.ts', async () => {
    seedRuntimeSessionExpiredAccessToken()
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

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
    expect(refreshKeycloakTokenMock).toHaveBeenCalledWith('refresh-token-1')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer new-access-token',
        }),
      }),
    )
  })

  it('Phase128RefreshOnlyOwnerUpgrade', async () => {
    const scenarios = [
      {
        name: 'member profile without access token',
        seed: seedRuntimeSessionMissingAccessToken,
        path: '/api/v1/members/canonical-owner',
        invoke: () => getMemberProfile('canonical-owner'),
        payload: { data: { member_id: 41, fansub_name: 'Canonical Owner' } },
      },
      {
        name: 'member contributions with expired access token',
        seed: seedRuntimeSessionExpiredAccessToken,
        path: '/api/v1/members/canonical-owner/contributions',
        invoke: () => getMemberContributions('canonical-owner'),
        payload: { role_timeline: [] },
      },
      {
        name: 'project-member summary without access token',
        seed: seedRuntimeSessionMissingAccessToken,
        path: '/api/v1/anime/7/group/9/members/canonical-owner',
        invoke: () => getProjectMemberSummary(7, 9, 'canonical-owner'),
        payload: { member_id: 41, member_slug: 'canonical-owner' },
      },
    ]
    const observed: Array<Record<string, unknown>> = []

    for (const scenario of scenarios) {
      clearAuthSession()
      scenario.seed()
      refreshKeycloakTokenMock.mockReset().mockResolvedValue(freshKeycloakBundle())
      const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        void init
        const url = String(input)
        return Promise.resolve(
          url.endsWith('/api/v1/me')
            ? makeCurrentUserResponse()
            : makeResponse(scenario.payload, { ok: true, status: 200 }),
        )
      })
      vi.stubGlobal('fetch', fetchMock)

      await scenario.invoke()

      const targetCall = fetchMock.mock.calls.find(([input]) => String(input).includes(scenario.path))
      const targetInit = targetCall?.[1] as RequestInit | undefined
      observed.push({
        name: scenario.name,
        refreshed: refreshKeycloakTokenMock.mock.calls.length === 1,
        authorization: (targetInit?.headers as Record<string, string> | undefined)?.Authorization,
        cache: targetInit?.cache,
      })
    }

    expect(observed).toEqual(scenarios.map((scenario) => ({
      name: scenario.name,
      refreshed: true,
      authorization: 'Bearer new-access-token',
      cache: 'no-store',
    })))
  })

  it('keeps all public-member reads on the central no-store fetch seam', () => {
    const helperNames = [
      'getMemberProfile',
      'getMemberProjects',
      'getMemberContributions',
      'getProjectMemberSummary',
      'getProjectMemberNotes',
      'getProjectMemberMedia',
      'getProjectMemberReleases',
    ]

    for (const helperName of helperNames) {
      const source = exportedFunctionSource(helperName)
      expect(source, helperName).toContain('apiClientFetch(')
      expect(source, helperName).toContain('cache: "no-store"')
      expect(source, helperName).not.toMatch(/\bfetch\(/)
    }
    expect(exportedFunctionSource('getMemberProfile')).not.toMatch(/\bauthToken\b/)
  })

  it.each([
    {
      name: 'release crew replace',
      invoke: () => replaceReleaseCrew(176, 9, { rows: [{ member_id: 4, role_codes: ['qc'] }] }),
      response: { data: [{ member_id: 4, role_codes: ['qc'] }], meta: { snapshot_mode: 'independent' } },
      path: '/api/v1/admin/release-versions/176/contributions/effective?fansub_group_id=9',
    },
    {
      name: 'project-note save',
      invoke: () => upsertAnimeFansubProjectNote(9, 22, {
        title: 'Projekt',
        bodyJson: { type: 'doc', content: [] },
        visibility: 'internal',
        status: 'draft',
        sortOrder: 0,
      }),
      response: {
        data: {
          id: 5,
          fansub_group_id: 9,
          anime_id: 22,
          title: 'Projekt',
          body_json: { type: 'doc', content: [] },
          body_plaintext: '',
          visibility: 'internal',
          status: 'draft',
          sort_order: 0,
          created_by: null,
          modified_by: null,
          created_at: '2026-07-24T00:00:00Z',
          updated_at: '2026-07-24T00:00:00Z',
        },
      },
      path: '/api/v1/admin/fansubs/9/anime/22/notes',
    },
    {
      name: 'leader confirmation',
      invoke: () => confirmProposal(9, 41),
      response: {},
      path: '/api/v1/admin/fansubs/9/contribution-proposals/41/confirm',
    },
    {
      name: 'member self-confirmation',
      invoke: () => confirmAnimeContribution(42),
      response: {},
      path: '/api/v1/me/anime-contributions/42/confirm',
    },
  ])('refreshes a missing access token for protected $name through the central seam', async ({ invoke, response, path }) => {
    clearAuthSession()
    seedRuntimeSessionMissingAccessToken()
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeCurrentUserResponse())
      .mockResolvedValueOnce(makeResponse(response, { ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(invoke()).resolves.not.toThrow()

    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toContain(path)
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer new-access-token' }),
    }))
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

  it('refreshes once and retries the private release playback access read', async () => {
    refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeResponse({ error: { message: 'ungueltiges zugriffstoken' } }, { ok: false, status: 401 }))
      .mockResolvedValueOnce(makeCurrentUserResponse())
      .mockResolvedValueOnce(makeResponse({ data: { can_play: true, stream_ready: true } }, { ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getReleasePlaybackAccess(12)).resolves.toEqual({ can_play: true, stream_ready: true })
    expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/api/v1/release-versions/12/playback-access')
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(expect.objectContaining({
      cache: 'no-store', headers: expect.objectContaining({ Authorization: 'Bearer new-access-token' }),
    }))
    expect(readCookie(AUTH_REFRESH_COOKIE_NAME)).toBe('fresh-refresh-token')
  })

  it('keeps a playback entitlement denial as denial without refresh retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ error: { message: 'keine berechtigung' } }, { ok: false, status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getReleasePlaybackAccess(12)).rejects.toMatchObject({ status: 403 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(refreshKeycloakTokenMock).not.toHaveBeenCalled()
  })

  it('clears the local session before remote Keycloak logout settles', async () => {
    let resolveRemoteLogout!: () => void
    logoutFromKeycloakMock.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveRemoteLogout = resolve
    }))

    expect(readCookie(AUTH_TOKEN_COOKIE_NAME)).toBe('stale-access-token')
    expect(readCookie(AUTH_REFRESH_COOKIE_NAME)).toBe('refresh-token-1')

    const logoutPromise = logoutActiveAuthSession()

    expect(logoutFromKeycloakMock).toHaveBeenCalledWith('refresh-token-1')
    expect(readCookie(AUTH_TOKEN_COOKIE_NAME)).toBe('')
    expect(readCookie(AUTH_REFRESH_COOKIE_NAME)).toBe('')
    expect(readCookie(AUTH_DISPLAY_NAME_COOKIE_NAME)).toBe('')
    expect(getAuthSessionSnapshot()).toMatchObject({
      hasAccessToken: false,
      hasRefreshToken: false,
    })

    resolveRemoteLogout()
    await expect(logoutPromise).resolves.toBeUndefined()
  })

  it('keeps local logout complete when remote Keycloak logout fails', async () => {
    logoutFromKeycloakMock.mockRejectedValueOnce(new Error('Keycloak logout unavailable'))

    await expect(logoutActiveAuthSession()).resolves.toBeUndefined()

    expect(readCookie(AUTH_TOKEN_COOKIE_NAME)).toBe('')
    expect(readCookie(AUTH_REFRESH_COOKIE_NAME)).toBe('')
    expect(getAuthSessionSnapshot()).toMatchObject({
      hasAccessToken: false,
      hasRefreshToken: false,
    })
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
