import { afterEach, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { GET, HEAD, POST } from './route'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
const params = { params: Promise.resolve({ path: ['media', 'files', 'poster.png'] }) }
it('HEAD obtains transformed metadata from upstream GET with no conditional/range semantics', async () => {
  const bytes = await sharp({ create: { width: 900, height: 1200, channels: 3, background: 'red' } }).png().toBuffer()
  const fetcher = vi.fn().mockImplementation(async () => new Response(new Uint8Array(bytes)))
  vi.stubGlobal('fetch', fetcher)
  const response = await HEAD(new Request('http://local/api/v1/media/files/poster.png?display_width=512', {
    method: 'HEAD', headers: { 'if-range': 'old', 'if-modified-since': 'yesterday', range: 'bytes=0-1' },
  }), params)
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/webp')
  expect(Number(response.headers.get('content-length'))).toBeGreaterThan(0)
  expect(await response.text()).toBe('')
  expect(fetcher.mock.calls[0][1].method).toBe('GET')
  expect([...fetcher.mock.calls[0][1].headers.keys()]).toEqual([])
})
it('keeps no-opt-in originals, non-file paths and writes on the original proxy contract', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response('original', { headers: { etag: 'original' } }))
  vi.stubGlobal('fetch', fetcher)
  const response = await GET(new Request('http://local/api/v1/media/files/poster.png', { headers: { range: 'bytes=0-1' } }), params)
  expect(await response.text()).toBe('original')
  expect(response.headers.get('etag')).toBe('original')
  expect(fetcher.mock.calls[0][1].headers.get('range')).toBe('bytes=0-1')
  await POST(new Request('http://local/api/v1/media/files/poster.png?display_width=512', { method: 'POST' }), params)
  expect(fetcher.mock.calls[1][0]).toContain('display_width=512')
  await GET(new Request('http://local/api/v1/media/other/poster.png?display_width=512'), {
    params: Promise.resolve({ path: ['media', 'other', 'poster.png'] }),
  })
  expect(fetcher.mock.calls[2][0]).toContain('display_width=512')
})
it('rejects duplicate bounds and unsafe filenames before upstream access', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  expect((await GET(new Request('http://local/api/v1/media/files/poster.png?display_width=512&display_width=760'), params)).status).toBe(400)
  expect((await GET(new Request('http://local/api/v1/media/files/poster.png?display_width=512'), {
    params: Promise.resolve({ path: ['media', 'files', '../other.png'] }),
  })).status).toBe(404)
  expect(fetcher).not.toHaveBeenCalled()
})
