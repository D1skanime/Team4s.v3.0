// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, clearAuthSession, getGroupedEpisodes, getEpisodeVersionEditorContext, persistAuthSession } from './api'

const { refreshKeycloakToken } = vi.hoisted(() => ({ refreshKeycloakToken: vi.fn() }))
vi.mock('@/lib/keycloakAuth', () => ({ isKeycloakEnabled: () => true, refreshKeycloakToken, logoutFromKeycloak: vi.fn() }))

const emptyPage = { data: { anime_id: 1, episodes: [], pagination: { has_more: false, next_cursor: null, row_limit: 24 } } }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('grouped episode API projections', () => {
  afterEach(() => { clearAuthSession({ broadcast: false }); vi.unstubAllGlobals() })

  it('keeps the complete default response and URL unchanged', async () => {
    const full = { data: { anime_id: 1, episodes: [{ episode_number: 1, version_count: 1, default_version_id: 100, versions: [{ id: 100, variant_id: 100, release_version_id: 10, media_provider: 'jellyfin', media_item_id: 'own', crc32: 'ABCDEF01', stream_url: 'https://fixture.invalid/own', segment_count: 1, has_segment_asset: true }] }] } }
    const fetchMock = vi.fn().mockResolvedValue(response(full)); vi.stubGlobal('fetch', fetchMock)
    await expect(getGroupedEpisodes(1)).resolves.toEqual(full)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/anime\/1\/episodes$/)
  })

  it('sends the public projection, escaped cursor, limit and abort signal once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(emptyPage)); vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await expect(getGroupedEpisodes(1, { projection: 'public', limit: 100, cursor: 'a+b/=&', signal: controller.signal })).resolves.toEqual(emptyPage)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    const query = new URL(url, 'https://fixture.invalid').searchParams
    expect(Object.fromEntries(query)).toEqual({ projection: 'public', limit: '100', cursor: 'a+b/=&' })
    expect(init.signal).toBe(controller.signal)
    expect(init.cache).toBe('no-store')
  })

  it('leaves the server default limit implicit and preserves neutral empty arrays', async () => {
    const neutral = { data: { ...emptyPage.data, episodes: [{ episode_id: 11, episode_number: 1, version_count: 0, versions: [] }] } }
    const fetchMock = vi.fn().mockResolvedValue(response(neutral)); vi.stubGlobal('fetch', fetchMock)
    await expect(getGroupedEpisodes(1, { projection: 'public' })).resolves.toEqual(neutral)
    expect(fetchMock.mock.calls[0][0]).toMatch(/episodes\?projection=public$/)
  })

  it('preserves a next cursor without fetching another page automatically', async () => {
    const page = { data: { ...emptyPage.data, pagination: { has_more: true, next_cursor: 'next', row_limit: 1 } } }
    const fetchMock = vi.fn().mockResolvedValue(response(page)); vi.stubGlobal('fetch', fetchMock)
    await expect(getGroupedEpisodes(1, { projection: 'public', limit: 1 })).resolves.toEqual(page)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each(['missing', 'expired'] as const)('refreshes a valid session with %s access token through the central client', async (state) => {
    const now = Math.floor(Date.now() / 1000)
    persistAuthSession({ token_type: 'Bearer', access_token: state === 'missing' ? '' : 'expired', access_token_expires_at: now - 100, access_token_expires_in: state === 'missing' ? 0 : 300, refresh_token: 'valid-refresh', refresh_token_expires_at: now + 7200, refresh_token_expires_in: 7200, user_id: 7, display_name: 'Fixture' })
    refreshKeycloakToken.mockResolvedValue({ accessToken: 'fresh-access', accessTokenExpiresAt: now + 3600, accessTokenExpiresIn: 3600, refreshToken: 'new-refresh', refreshTokenExpiresAt: now + 7200, refreshTokenExpiresIn: 7200, tokenType: 'Bearer' })
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ data: { app_user_id: 7, legacy_user_id: 7, display_name: 'Fixture', email: 'fixture@example.invalid', keycloak_subject: 'fixture-7', status: 'active', global_roles: [], is_platform_admin: false, session_id: 'fixture-session' } })).mockResolvedValueOnce(response(emptyPage))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getGroupedEpisodes(1, { projection: 'public' })).resolves.toEqual(emptyPage)
    expect(refreshKeycloakToken).toHaveBeenLastCalledWith('valid-refresh')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-access')
  })

  it('surfaces invalid scope and limit as the existing ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: { message: 'ungültige Episodenoptionen' } }, 400)))
    const request = getGroupedEpisodes(1, { projection: 'public', limit: 101 })
    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({ status: 400, message: 'ungültige Episodenoptionen' })
  })
})


describe('editor selected-file metadata through central refresh seam', () => {
  afterEach(() => { clearAuthSession({ broadcast: false }); vi.unstubAllGlobals() })

  it.each(['missing', 'expired'] as const)('keeps safe chapter null/empty values with %s access token', async (state) => {
    const now = Math.floor(Date.now() / 1000)
    persistAuthSession({ token_type: 'Bearer', access_token: state === 'missing' ? '' : 'expired', access_token_expires_at: now - 100, access_token_expires_in: state === 'missing' ? 0 : 300, refresh_token: 'valid-refresh', refresh_token_expires_at: now + 7200, refresh_token_expires_in: 7200, user_id: 7, display_name: 'Fixture' })
    refreshKeycloakToken.mockResolvedValue({ accessToken: 'fresh-access', accessTokenExpiresAt: now + 3600, accessTokenExpiresIn: 3600, refreshToken: 'new-refresh', refreshTokenExpiresAt: now + 7200, refreshTokenExpiresIn: 7200, tokenType: 'Bearer' })
    const payload = { data: { version: { id: 28 }, selected_file: { file_name: 'a.mkv', path: '', media_item_id: '', file_size_bytes: 111, chapter_hints: state === 'missing' ? null : [] } } }
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ data: { app_user_id: 7, legacy_user_id: 7, display_name: 'Fixture', email: 'fixture@example.invalid', keycloak_subject: 'fixture-7', status: 'active', global_roles: [], is_platform_admin: false, session_id: 'fixture-session' } })).mockResolvedValueOnce(response(payload))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getEpisodeVersionEditorContext(28)).resolves.toEqual(payload)
    expect(refreshKeycloakToken).toHaveBeenLastCalledWith('valid-refresh')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toMatch(/episode-versions\/28\/editor-context$/)
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-access')
  })
})
