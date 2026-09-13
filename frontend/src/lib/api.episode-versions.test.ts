// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, clearAuthSession, getGroupedEpisodes } from './api'

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

  it('surfaces invalid scope and limit as the existing ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: { message: 'ungültige Episodenoptionen' } }, 400)))
    const request = getGroupedEpisodes(1, { projection: 'public', limit: 101 })
    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({ status: 400, message: 'ungültige Episodenoptionen' })
  })
})
