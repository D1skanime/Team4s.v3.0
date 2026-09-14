import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { GET, HEAD } from './route'
import { GET as original } from '@/app/covers/[file]/route'

let directory: string
let bytes: Buffer
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'team4s-cover-display-'))
  await mkdir(path.join(directory, 'public', 'covers'), { recursive: true })
  bytes = await sharp({ create: { width: 1000, height: 1400, channels: 3, background: 'red' } }).png().toBuffer()
  await writeFile(path.join(directory, 'public', 'covers', 'poster.png'), bytes)
  await writeFile(path.join(directory, 'public', 'covers', 'vector.svg'), '<svg/>')
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => rm(directory, { recursive: true, force: true }))
function params(file = 'poster.png') { return { params: Promise.resolve({ file }) } }
it('serves actual bounded cover bytes and HEAD while preserving original PNG/SVG routes', async () => {
  vi.spyOn(process, 'cwd').mockReturnValue(directory)
  const request = new Request('http://local/covers/display/poster.png?display_width=512')
  const display = await GET(request, params())
  expect(display.status).toBe(200)
  expect((await sharp(Buffer.from(await display.arrayBuffer())).metadata()).width).toBe(512)
  const head = await HEAD(new Request(request, { method: 'HEAD' }), params())
  expect(head.headers.get('content-type')).toBe('image/webp')
  expect(await head.text()).toBe('')
  expect(Buffer.from(await (await original(new Request('http://local/covers/poster.png'), params())).arrayBuffer())).toEqual(bytes)
  expect(await (await original(new Request('http://local/covers/vector.svg'), params('vector.svg'))).text()).toBe('<svg/>')
  expect((await GET(request, params('vector.svg'))).status).toBe(415)
})
it('rejects invalid names, missing originals and absent/invalid display opt-in without fallback', async () => {
  vi.spyOn(process, 'cwd').mockReturnValue(directory)
  const request = new Request('http://local/covers/display/poster.png?display_width=512')
  expect((await GET(request, params('../poster.png'))).status).toBe(404)
  expect((await GET(request, params('missing.png'))).status).toBe(404)
  expect((await GET(new Request('http://local/covers/display/poster.png'), params())).status).toBe(400)
  const head = await HEAD(new Request('http://local/covers/display/poster.png?display_width=1', { method: 'HEAD' }), params())
  expect(head.status).toBe(400); expect(await head.text()).toBe('')
})
