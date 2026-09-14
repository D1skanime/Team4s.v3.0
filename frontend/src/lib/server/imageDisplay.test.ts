import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { mkdtemp, mkdir, writeFile, rm, truncate } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import { serveImageDisplay } from './imageDisplay'
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array(png), { headers: {
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

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type)
  let crc = 0xffffffff
  for (const byte of Buffer.concat([name, data])) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  const output = Buffer.alloc(data.length + 12)
  output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8)
  output.writeUInt32BE((crc ^ 0xffffffff) >>> 0, output.length - 4)
  return output
}

function animatedPng(): Buffer {
  const width = 1200, height = 800
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6
  const animation = Buffer.alloc(8); animation.writeUInt32BE(2)
  const control = (sequence: number) => {
    const frame = Buffer.alloc(26)
    frame.writeUInt32BE(sequence); frame.writeUInt32BE(width, 4); frame.writeUInt32BE(height, 8)
    frame.writeUInt16BE(1, 20); frame.writeUInt16BE(10, 22)
    return chunk('fcTL', frame)
  }
  const pixels = (red: boolean) => {
    const raw = Buffer.alloc((width * 4 + 1) * height)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4
      raw[offset + (red ? 0 : 2)] = 255; raw[offset + 3] = 128
    }
    return deflateSync(raw)
  }
  const sequence = Buffer.alloc(4); sequence.writeUInt32BE(2)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('acTL', animation), control(0), chunk('IDAT', pixels(true)), control(1),
    chunk('fdAT', Buffer.concat([sequence, pixels(false)])), chunk('IEND', Buffer.alloc(0)),
  ])
}

async function imageResponse(bytes: Buffer, width = 512, method = 'GET'): Promise<Response> {
  return serveImageDisplay(new Request('http://local/image?display_width=' + width, { method }), {
    load: async () => new Response(new Uint8Array(bytes)),
  })
}

describe('real raster and resource limits', () => {
  it.each(['gif', 'webp', 'apng'])('flattens real two-frame %s input to bounded transparent first-frame WebP', async (format) => {
    let input: Buffer
    if (format === 'apng') {
      input = animatedPng()
      expect(input.includes(Buffer.from('acTL'))).toBe(true)
    } else {
      const raw = Buffer.alloc(1200 * 800 * 2 * 4)
      for (let index = 0; index < raw.length; index += 4) {
        raw[index + (index < raw.length / 2 ? 0 : 2)] = 255
        raw[index + 3] = index % 16 === 0 ? 0 : 255
      }
      const encoder = sharp(raw, { raw: { width: 1200, height: 1600, channels: 4, pageHeight: 800 } })
      input = format === 'gif' ? await encoder.gif().toBuffer() : await encoder.webp({ lossless: true }).toBuffer()
      expect((await sharp(input, { animated: true }).metadata()).pages).toBe(2)
    }
    const response = await imageResponse(input)
    expect(response.status).toBe(200)
    const output = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(output, { animated: true }).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(512)
    expect(metadata.pages ?? 1).toBe(1)
    expect(metadata.hasAlpha).toBe(true)
    const { data } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(data[4]).toBeGreaterThan(data[6]) // first red frame, not second blue frame
    expect(output.length).toBeLessThanOrEqual(4 * 1024 * 1024)
  })

  it.each([512, 760, 1280, 1920])('bounds actual output dimensions and bytes for slot %s', async (width) => {
    const input = await sharp({ create: { width: 2000, height: 5000, channels: 3, background: 'red' } }).png().toBuffer()
    const output = Buffer.from(await (await imageResponse(input, width)).arrayBuffer())
    const metadata = await sharp(output).metadata()
    expect(metadata.width).toBeLessThanOrEqual(width)
    expect(metadata.height).toBeLessThanOrEqual(Math.min(width * 3, 4096))
    expect(output.length).toBeLessThanOrEqual(4 * 1024 * 1024)
  })

  it('does not enlarge a small image and HEAD describes the transformed representation', async () => {
    const small = await sharp({ create: { width: 20, height: 30, channels: 3, background: 'red' } }).png().toBuffer()
    const get = await imageResponse(small)
    const bytes = Buffer.from(await get.arrayBuffer())
    expect((await sharp(bytes).metadata()).width).toBe(20)
    const head = await imageResponse(small, 512, 'HEAD')
    expect(head.headers.get('content-length')).toBe(String(bytes.length))
    expect(head.headers.get('content-type')).toBe('image/webp')
    expect(await head.text()).toBe('')
  })

  it.each(['', '511', '512x', '0512', '512&display_width=760'])('rejects invalid width %s before reading', async (value) => {
    const load = vi.fn()
    expect((await serveImageDisplay(new Request('http://local/image?display_width=' + value), { load })).status).toBe(400)
    expect(load).not.toHaveBeenCalled()
  })

  it('rejects SVG and corrupt raster without falling through to originals', async () => {
    for (const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from('GIF89abroken')]) {
      expect((await imageResponse(bytes)).status).toBe(415)
    }
  })

  it('bounds local input before reading and decoded pixels before resizing', async () => {
    const file = path.join(directory, 'large.png')
    await writeFile(file, '')
    await truncate(file, 16 * 1024 * 1024 + 1)
    const request = new Request('http://local/image?display_width=512')
    expect((await serveImageDisplay(request, { filePath: file })).status).toBe(413)
    const giant = await sharp({ create: { width: 5000, height: 4001, channels: 3, background: 'red' } }).png().toBuffer()
    expect((await imageResponse(giant)).status).toBe(413)
  })

  it('caps streamed bytes without Content-Length and cancels the source', async () => {
    let pulls = 0
    const cancel = vi.fn()
    const response = await serveImageDisplay(new Request('http://local/image?display_width=512'), {
      load: async () => new Response(new ReadableStream({
        pull(controller) { pulls++; controller.enqueue(new Uint8Array(1024 * 1024)) },
        cancel,
      })),
    })
    expect(response.status).toBe(413)
    expect(pulls).toBeLessThanOrEqual(19)
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('admits four distinct cold-start images through two active slots', async () => {
    let active = 0, peak = 0
    const results = await Promise.all(Array.from({ length: 4 }, (_, id) =>
      serveImageDisplay(new Request('http://local/image/' + id + '?display_width=512'), {
        load: async () => {
          active++; peak = Math.max(peak, active)
          await new Promise((resolve) => setTimeout(resolve, 10))
          active--
          return new Response(new Uint8Array(png))
        },
      })))
    expect(results.map((response) => response.status)).toEqual([200, 200, 200, 200])
    expect(peak).toBe(2)
  })

  it('bounds pending admission and queued abort never starts a source read', async () => {
    const controller = new AbortController()
    const load = vi.fn(async () => new Response(new ReadableStream()))
    const pending = Array.from({ length: 10 }, () => serveImageDisplay(
      new Request('http://local/image?display_width=512', { signal: controller.signal }), { load }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(load).toHaveBeenCalledTimes(2)
    expect((await imageResponse(png)).status).toBe(429)
    controller.abort()
    expect((await Promise.all(pending)).every((response) => response.status === 408)).toBe(true)
    expect(load).toHaveBeenCalledTimes(2)
    expect((await imageResponse(png)).status).toBe(200)
  })

  it('aborts a stalled stream, cancels its reader and releases capacity', async () => {
    const controller = new AbortController()
    const cancel = vi.fn()
    const pending = serveImageDisplay(new Request('http://local/image?display_width=512', { signal: controller.signal }), {
      load: async () => new Response(new ReadableStream({ cancel })),
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    controller.abort()
    expect((await pending).status).toBe(408)
    expect(cancel).toHaveBeenCalledOnce()
    expect((await imageResponse(png)).status).toBe(200)
  })

  it.each([301, 304, 401, 404, 500, 206])('does not turn upstream %s into image 200', async (status) => {
    const response = await serveImageDisplay(new Request('http://local/image?display_width=512'), {
      load: async () => new Response(null, { status, headers: { etag: 'original', 'content-type': 'image/png' } }),
    })
    expect(response.status).toBe(status === 206 ? 502 : status)
    expect(response.headers.get('content-type')).not.toBe('image/webp')
    expect(response.headers.get('etag')).toBeNull()
  })
})

it('rejects an advertised oversized source before pulling bytes', async () => {
  const cancel = vi.fn()
  const response = await serveImageDisplay(new Request('http://local/image?display_width=512'), {
    load: async () => new Response(new ReadableStream({ cancel }), { headers: { 'content-length': String(16 * 1024 * 1024 + 1) } }),
  })
  expect(response.status).toBe(413)
  expect(cancel).toHaveBeenCalledOnce()
})

it('expires stalled source reads and queued admission after five seconds', async () => {
  vi.useFakeTimers()
  try {
    const load = vi.fn(async () => new Response(new ReadableStream()))
    const pending = Array.from({ length: 4 }, () => serveImageDisplay(
      new Request('http://local/image?display_width=512'), { load }))
    await vi.advanceTimersByTimeAsync(5000)
    expect((await Promise.all(pending)).map((response) => response.status)).toEqual([408, 408, 408, 408])
    expect(load).toHaveBeenCalledTimes(2)
  } finally { vi.useRealTimers() }
})

it('serves the actual shared anime display placeholder as decodable bounded bytes', async () => {
  const { resolveAnimeCoverURL } = await import('@/lib/animeBackdrops')
  const cover = await import('@/app/covers/[file]/display/route')
  const url = new URL(resolveAnimeCoverURL(), 'http://local')
  const response = await cover.GET(new Request(url), { params: Promise.resolve({ file: url.pathname.split('/')[2] }) })
  expect(response.status).toBe(200)
  const bytes = Buffer.from(await response.arrayBuffer())
  expect((await sharp(bytes).metadata()).width).toBeLessThanOrEqual(512)
})
