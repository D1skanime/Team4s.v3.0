// Quick task 260910-s1b: RFC 7233 Range support for the media-serving route.
//
// Calls the real exported GET handler directly against fixture files written to a temp
// directory, and asserts on actual response status/headers/body bytes -- never on route.ts's
// source text. MEDIA_BASE_PATH is set to the temp directory BEFORE the first dynamic import of
// './route', since the module reads that env var once at load time via a top-level const.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { NextRequest } from 'next/server'

const FIXTURE_SIZE = 1000

let GET: typeof import('./route').GET
let tmpDir: string

function makeParams(...segments: string[]) {
  return { params: Promise.resolve({ path: segments }) }
}

function makeRequest(url: string, rangeHeader?: string) {
  const headers: Record<string, string> = {}
  if (rangeHeader !== undefined) headers['Range'] = rangeHeader
  return new NextRequest(url, { headers })
}

function fixtureSlice(start: number, end: number): Buffer {
  const buffer = Buffer.alloc(end - start + 1)
  for (let index = start; index <= end; index += 1) buffer[index - start] = index % 256
  return buffer
}

beforeAll(async () => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'media-route-test-'))
  const subDir = path.join(tmpDir, 'sub')
  mkdirSync(subDir, { recursive: true })
  const fixture = fixtureSlice(0, FIXTURE_SIZE - 1)
  writeFileSync(path.join(subDir, 'clip.mp4'), fixture)

  process.env.MEDIA_BASE_PATH = tmpDir
  const mod = await import('./route')
  GET = mod.GET
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('media route Range support (RFC 7233)', () => {
  it('mid-range request (bytes=100-199) returns 206 with exact byte slice', async () => {
    const request = makeRequest('http://localhost/media/sub/clip.mp4', 'bytes=100-199')
    const response = await GET(request, makeParams('sub', 'clip.mp4'))

    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 100-199/1000')
    expect(response.headers.get('content-length')).toBe('100')
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body).toEqual(fixtureSlice(100, 199))
  })

  it('suffix range request (bytes=-100) returns 206 with the last 100 bytes', async () => {
    const request = makeRequest('http://localhost/media/sub/clip.mp4', 'bytes=-100')
    const response = await GET(request, makeParams('sub', 'clip.mp4'))

    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 900-999/1000')
    expect(response.headers.get('content-length')).toBe('100')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body).toEqual(fixtureSlice(900, 999))
  })

  it('open-ended range request (bytes=500-) returns 206 with the rest of the file', async () => {
    const request = makeRequest('http://localhost/media/sub/clip.mp4', 'bytes=500-')
    const response = await GET(request, makeParams('sub', 'clip.mp4'))

    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 500-999/1000')
    expect(response.headers.get('content-length')).toBe('500')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body).toEqual(fixtureSlice(500, 999))
  })

  it('unsatisfiable range (start beyond file size) returns 416 with no leaked body', async () => {
    const request = makeRequest('http://localhost/media/sub/clip.mp4', 'bytes=5000-6000')
    const response = await GET(request, makeParams('sub', 'clip.mp4'))

    expect(response.status).toBe(416)
    expect(response.headers.get('content-range')).toBe('bytes */1000')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.length).toBe(0)
  })

  it('no Range header returns 200 with the complete file and Accept-Ranges', async () => {
    const request = makeRequest('http://localhost/media/sub/clip.mp4')
    const response = await GET(request, makeParams('sub', 'clip.mp4'))

    expect(response.status).toBe(200)
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(response.headers.get('content-length')).toBe('1000')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body).toEqual(fixtureSlice(0, 999))
  })

  it('malformed/unsupported unit (items=0-10) falls back to 200 whole-file, unchanged', async () => {
    const request = makeRequest('http://localhost/media/sub/clip.mp4', 'items=0-10')
    const response = await GET(request, makeParams('sub', 'clip.mp4'))

    expect(response.status).toBe(200)
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(response.headers.get('content-length')).toBe('1000')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body).toEqual(fixtureSlice(0, 999))
  })

  it('multi-range header (bytes=0-9,20-29) falls back to 200 whole-file, not an error', async () => {
    const request = makeRequest('http://localhost/media/sub/clip.mp4', 'bytes=0-9,20-29')
    const response = await GET(request, makeParams('sub', 'clip.mp4'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-length')).toBe('1000')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body).toEqual(fixtureSlice(0, 999))
  })

  it('path traversal with ".." is still rejected with 403', async () => {
    const request = makeRequest('http://localhost/media/../secret')
    const response = await GET(request, makeParams('..', 'secret'))

    expect(response.status).toBe(403)
  })

  it('path traversal with "~" is still rejected with 403', async () => {
    const request = makeRequest('http://localhost/media/~/secret')
    const response = await GET(request, makeParams('~', 'secret'))

    expect(response.status).toBe(403)
  })
})
