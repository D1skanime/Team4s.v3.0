import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'

const { cookieValues, cookiesMock } = vi.hoisted(() => {
  const cookieValues = new Map<string, string>()
  return { cookieValues, cookiesMock: vi.fn(async () => ({ get: (key: string) => cookieValues.has(key) ? { value: cookieValues.get(key) } : undefined })) }
})
vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/lib/api', () => ({ AUTH_BEARER_TOKEN: '', AUTH_TOKEN_COOKIE_NAME: 'access', AUTH_REFRESH_COOKIE_NAME: 'refresh', AUTH_DISPLAY_NAME_COOKIE_NAME: 'display' }))
import { GET } from './route'

const api = 'http://backend.fixture'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const granted = () => json({ data: { grant_token: 'fresh-grant' } }, 201)
const refreshed = () => json({ data: { access_token: 'fresh-access', access_token_expires_in: 900, refresh_token: 'fresh-refresh', refresh_token_expires_in: 7200, display_name: 'Fixture' } })
const media = () => new Response('data', { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Length': '4', 'Content-Range': 'bytes 0-3/10', 'Accept-Ranges': 'bytes', ETag: 'fixture-etag', 'Cache-Control': 'no-store' } })
const request = (id: string, query: string) => GET(new NextRequest(`http://relay.fixture/api/releases/${encodeURIComponent(id)}/stream?${query}`, { headers: { Range: 'bytes=0-3', 'User-Agent': 'fixture-agent' } }), { params: Promise.resolve({ id }) })

describe('release stream explicit variant identity', () => {
  beforeEach(() => { vi.stubEnv('API_INTERNAL_URL', api); cookieValues.clear(); cookiesMock.mockClear() })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('sends the same selector to initial grant and stream while preserving offset, range and response headers', async () => {
    cookieValues.set('access', 'access-token')
    const fetchMock = vi.fn().mockResolvedValueOnce(granted()).mockResolvedValueOnce(media()); vi.stubGlobal('fetch', fetchMock)
    const result = await request('10', 'variant_id=100&StartTimeTicks=500')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(`${api}/api/v1/releases/10/grant?variant_id=100`)
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    const target = new URL(fetchMock.mock.calls[1][0])
    expect(target.pathname).toBe('/api/v1/releases/10/stream')
    expect(Object.fromEntries(target.searchParams)).toEqual({ variant_id: '100', startTimeTicks: '500', grant: 'fresh-grant' })
    const headers = new Headers(fetchMock.mock.calls[1][1].headers)
    expect(headers.get('Range')).toBe('bytes=0-3'); expect(headers.get('User-Agent')).toBe('fixture-agent')
    expect(result.status).toBe(206); expect(await result.text()).toBe('data')
    for (const [key, value] of Object.entries({ 'content-type': 'video/mp4', 'content-length': '4', 'content-range': 'bytes 0-3/10', 'accept-ranges': 'bytes', etag: 'fixture-etag', 'cache-control': 'no-store' })) expect(result.headers.get(key)).toBe(value)
  })

  it('keeps the selector with a provided grant without requesting another grant', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(media()); vi.stubGlobal('fetch', fetchMock)
    expect((await request('10', 'variant_id=100&grant=provided%2Bgrant')).status).toBe(206)
    expect(fetchMock).toHaveBeenCalledOnce()
    const query = new URL(fetchMock.mock.calls[0][0]).searchParams
    expect(query.get('variant_id')).toBe('100'); expect(query.get('grant')).toBe('provided+grant')
  })

  it('uses the central refresh flow when only a refresh session exists', async () => {
    cookieValues.set('refresh', 'valid-refresh')
    const fetchMock = vi.fn().mockResolvedValueOnce(refreshed()).mockResolvedValueOnce(granted()).mockResolvedValueOnce(media()); vi.stubGlobal('fetch', fetchMock)
    const result = await request('10', 'variant_id=100')
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/api/v1/auth/refresh', '/api/v1/releases/10/grant', '/api/v1/releases/10/stream'])
    expect(fetchMock.mock.calls[1][0]).toContain('variant_id=100'); expect(fetchMock.mock.calls[2][0]).toContain('variant_id=100')
    expect(result.cookies.get('access')?.value).toBe('fresh-access'); expect(result.cookies.get('refresh')?.value).toBe('fresh-refresh')
  })

  it('preserves both identities when the grant request returns 401 and is retried after refresh', async () => {
    cookieValues.set('access', 'expired-access'); cookieValues.set('refresh', 'valid-refresh')
    const fetchMock = vi.fn().mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(refreshed()).mockResolvedValueOnce(granted()).mockResolvedValueOnce(media()); vi.stubGlobal('fetch', fetchMock)
    const result = await request('10', 'variant_id=100')
    expect(result.status).toBe(206); expect(fetchMock).toHaveBeenCalledTimes(4)
    for (const index of [0, 2]) expect(fetchMock.mock.calls[index][0]).toBe(`${api}/api/v1/releases/10/grant?variant_id=100`)
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get('Authorization')).toBe('Bearer fresh-access')
    expect(new URL(fetchMock.mock.calls[3][0]).searchParams.get('variant_id')).toBe('100')
    expect(result.cookies.get('refresh')?.value).toBe('fresh-refresh')
  })

  it('preserves the selector during upstream 401 recovery from a provided grant', async () => {
    cookieValues.set('refresh', 'valid-refresh')
    const fetchMock = vi.fn().mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(refreshed()).mockResolvedValueOnce(granted()).mockResolvedValueOnce(media()); vi.stubGlobal('fetch', fetchMock)
    const result = await request('10', 'variant_id=100&grant=expired-grant&startTimeTicks=500')
    expect(result.status).toBe(206); expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[2][0]).toBe(`${api}/api/v1/releases/10/grant?variant_id=100`)
    for (const index of [0, 3]) {
      const query = new URL(fetchMock.mock.calls[index][0]).searchParams
      expect(query.get('variant_id')).toBe('100'); expect(query.get('startTimeTicks')).toBe('500')
    }
    expect(new URL(fetchMock.mock.calls[3][0]).searchParams.get('grant')).toBe('fresh-grant')
    expect(result.cookies.get('access')?.value).toBe('fresh-access')
  })

  it.each(['', '0', '-1', '1.5', '100abc', '+100', ' 100', '9007199254740992'])('rejects malformed selector %j before cookies or network', async (value) => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect((await request('10', `variant_id=${encodeURIComponent(value)}`)).status).toBe(400)
    expect(cookiesMock).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled()
  })
  it.each(['10abc', '1.5', '+10', ' 10', '0', '-1', '9007199254740992'])('requires a complete safe canonical path with selector: %j', async (id) => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect((await request(id, 'variant_id=100')).status).toBe(400)
    expect(cookiesMock).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled()
  })
  it('rejects duplicate selectors before network access', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    expect((await request('10', 'variant_id=100&variant_id=10')).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([403, 404])('preserves the backend rejection %i for a foreign or denied selector', async (status) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ error: { message: 'abgewiesen' } }, status)); vi.stubGlobal('fetch', fetchMock)
    const result = await request('10', 'variant_id=10&grant=version10-grant')
    expect(result.status).toBe(status); expect(fetchMock).toHaveBeenCalledOnce()
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('variant_id')).toBe('10')
  })

  it('keeps the legacy path parser and URLs when no selector is supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(media()); vi.stubGlobal('fetch', fetchMock)
    expect((await request('10legacy', 'grant=legacy&startTimeTicks=500')).status).toBe(206)
    expect(fetchMock.mock.calls[0][0]).toBe(`${api}/api/v1/releases/10/stream?startTimeTicks=500&grant=legacy`)
  })

  it('documents the selector at both existing backend endpoints', () => {
    const contract = readFileSync(new URL('../../../../../../../shared/contracts/openapi.yaml', import.meta.url), 'utf8')
    for (const path of ['/api/v1/releases/{id}/grant', '/api/v1/releases/{id}/stream']) {
      const endpoint = contract.split(`  ${path}:\n`)[1]?.split(/\n  \/api/)[0] ?? ''
      expect(endpoint).toContain('- name: variant_id')
      expect(endpoint).toContain('canonical release version')
      expect(endpoint).toContain('"400":')
    }
  })
})
