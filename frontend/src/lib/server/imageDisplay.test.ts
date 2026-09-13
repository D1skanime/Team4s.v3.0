import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { NextRequest } from 'next/server'

let directory: string
let png: Buffer
let media: typeof import('@/app/media/[...path]/route')
let api: typeof import('@/app/api/v1/[...path]/route')

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'team4s-display-'))
  await mkdir(path.join(directory, 'anime'))
  png = await sharp({ create: { width: 1200, height: 1800, channels: 4, background: '#ff000080' } }).png().toBuffer()
  await writeFile(path.join(directory, 'anime', 'cover.png'), png)
  vi.stubEnv('MEDIA_BASE_PATH', directory)
  vi.stubEnv('API_INTERNAL_URL', 'http://private-api:8092')
  media = await import('@/app/media/[...path]/route')
  api = await import('@/app/api/v1/[...path]/route')
})
afterEach(() => vi.unstubAllGlobals())
afterAll(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }) })

describe('explicit frontend display delivery', () => {
  it('resizes actual local bytes, ignoring original Range/conditional headers', async () => {
    const response = await media.GET(new NextRequest('http://local/media/anime/cover.png?display_width=512', {
      headers: { range: 'bytes=0-10', 'if-none-match': 'original' },
    }), { params: Promise.resolve({ path: ['anime', 'cover.png'] }) })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
    const output = Buffer.from(await response.arrayBuffer())
    expect(await sharp(output).metadata()).toMatchObject({ width: 512, height: 768, hasAlpha: true })
    expect(response.headers.get('content-range')).toBeNull()
    expect(output.length).toBeLessThan(png.length)
  })

  it('routes API files through the fixed internal proxy and rewrites representation headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(png, { headers: {
      'content-type': 'image/png', etag: 'original', 'content-encoding': 'gzip',
      'accept-ranges': 'bytes', 'content-range': 'bytes 0-10/100', 'cache-control': 'private, no-store',
    } }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await api.GET(new Request('http://local/api/v1/media/files/cover.png?display_width=512', {
      headers: { range: 'bytes=0-10', 'if-none-match': 'original', authorization: 'Bearer session' },
    }), { params: Promise.resolve({ path: ['media', 'files', 'cover.png'] }) })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width).toBe(512)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://private-api:8092/api/v1/media/files/cover.png')
    expect(init.headers.get('range')).toBeNull()
    expect(init.headers.get('if-none-match')).toBeNull()
    expect(init.headers.get('authorization')).toBe('Bearer session')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.redirect).toBe('manual')
    for (const header of ['etag', 'content-encoding', 'content-range', 'accept-ranges']) {
      expect(response.headers.get(header)).toBeNull()
    }
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
