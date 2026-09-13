import { constants } from 'node:fs'
import { open } from 'node:fs/promises'
import sharp from 'sharp'
import { parseImageDisplayWidth } from '@/lib/imageDisplayContract'

const MAX_INPUT_BYTES = 16 * 1024 * 1024
const MAX_INPUT_PIXELS = 20_000_000
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024
const TIMEOUT_MS = 5000
// Shared across route bundles in one process; bounded admission, no per-image cache.
const capacityKey = Symbol.for('team4s.imageDisplay.capacity')
type Waiting = { start: () => void }
const processState = globalThis as typeof globalThis & { [capacityKey]?: { active: number; waiting: Waiting[] } }
const capacity = processState[capacityKey] ??= { active: 0, waiting: [] }

type DisplaySource = { filePath: string } | { load: (signal: AbortSignal) => Promise<Response> }
class DisplayError extends Error {
  constructor(readonly status: number) { super('Bild kann nicht angezeigt werden.') }
}

async function acquire(signal: AbortSignal): Promise<void> {
  checkAbort(signal)
  if (capacity.active < 2) { capacity.active += 1; return }
  if (capacity.waiting.length >= 8) throw new DisplayError(429)
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      const index = capacity.waiting.indexOf(waiting)
      if (index !== -1) capacity.waiting.splice(index, 1)
      reject(new DisplayError(408))
    }
    const waiting: Waiting = {
      start: () => { signal.removeEventListener('abort', abort); resolve() },
    }
    signal.addEventListener('abort', abort, { once: true })
    capacity.waiting.push(waiting)
  })
}

function release(): void {
  const waiting = capacity.waiting.shift()
  if (waiting) waiting.start() // The slot transfers without admitting another native job.
  else capacity.active -= 1
}

function fail(status: number): Response {
  return new Response([204, 304].includes(status) ? null : 'Bild kann nicht angezeigt werden.', {
    status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) throw new DisplayError(408)
}

async function readLocal(filePath: string, signal: AbortSignal): Promise<Buffer> {
  const file = await open(filePath, constants.O_RDONLY | constants.O_NONBLOCK)
  try {
    const stats = await file.stat()
    if (!stats.isFile()) throw new DisplayError(404)
    if (stats.size > MAX_INPUT_BYTES) throw new DisplayError(413)
    const chunks: Buffer[] = []
    let size = 0
    while (true) {
      checkAbort(signal)
      // Includes one sentinel byte, so growth after stat cannot escape the bound.
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, MAX_INPUT_BYTES - size + 1))
      const { bytesRead } = await file.read(chunk, 0, chunk.length, null)
      if (!bytesRead) return Buffer.concat(chunks, size)
      size += bytesRead
      if (size > MAX_INPUT_BYTES) throw new DisplayError(413)
      chunks.push(chunk.subarray(0, bytesRead))
    }
  } finally { await file.close() }
}

async function readUpstream(response: Response, signal: AbortSignal): Promise<Buffer> {
  const advertised = Number(response.headers.get('content-length'))
  if (advertised > MAX_INPUT_BYTES) {
    await response.body?.cancel()
    throw new DisplayError(413)
  }
  if (!response.body) throw new DisplayError(415)
  const reader = response.body.getReader()
  const cancel = () => { void reader.cancel().catch(() => undefined) }
  signal.addEventListener('abort', cancel, { once: true })
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      checkAbort(signal)
      const { value, done } = await reader.read()
      checkAbort(signal)
      if (done) return Buffer.concat(chunks, size)
      size += value.byteLength
      if (size > MAX_INPUT_BYTES) throw new DisplayError(413)
      chunks.push(value)
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function isRaster(bytes: Buffer): boolean {
  return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii')) ||
    (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') ||
    (bytes.subarray(4, 8).toString('ascii') === 'ftyp' && /^avi[fs]$/.test(bytes.subarray(8, 12).toString('ascii')))
}

/** Fixed first-frame WebP delivery, only for sources already resolved by their serving owner. */
async function displayResponse(request: Request, source: DisplaySource): Promise<Response> {
  const width = parseImageDisplayWidth(new URL(request.url))
  if (!width) return fail(400)
  if (request.signal.aborted) return fail(408)
  const controller = new AbortController()
  const abort = () => controller.abort()
  request.signal.addEventListener('abort', abort, { once: true })
  const deadline = Date.now() + TIMEOUT_MS
  const timeout = setTimeout(abort, TIMEOUT_MS)
  let acquired = false
  try {
    await acquire(controller.signal)
    acquired = true
    if (Date.now() >= deadline) controller.abort()
    checkAbort(controller.signal)
    let bytes: Buffer
    // API files can carry credentials. Their transformed representation remains private.
    let cacheControl = 'public, max-age=60'
    if ('filePath' in source) {
      bytes = await readLocal(source.filePath, controller.signal)
    } else {
      cacheControl = 'private, no-store'
      const upstream = await source.load(controller.signal)
      checkAbort(controller.signal)
      if (upstream.status !== 200) {
        await upstream.body?.cancel()
        return fail(upstream.status >= 300 ? upstream.status : 502)
      }
      bytes = await readUpstream(upstream, controller.signal)
    }
    checkAbort(controller.signal)
    if (!isRaster(bytes)) throw new DisplayError(415)
    const height = Math.min(width * 3, 4096)
    // pages:1 deliberately flattens GIF/APNG/WebP to the first frame. No SVG decoder.
    const { data, info } = await sharp(bytes, {
      limitInputPixels: MAX_INPUT_PIXELS, page: 0, pages: 1, animated: false, failOn: 'warning',
    }).rotate().resize({ width, height, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75, alphaQuality: 75, effort: 3 }).timeout({ seconds: 5 })
      .toBuffer({ resolveWithObject: true })
    // Keep the capacity slot until the bounded native job settles, including on abort.
    checkAbort(controller.signal)
    if (info.width > width || info.height > height || data.length > MAX_OUTPUT_BYTES) throw new DisplayError(413)
    return new Response(request.method === 'HEAD' ? null : new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp', 'Content-Length': String(data.length),
        'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (controller.signal.aborted) return fail(408)
    if (error instanceof DisplayError) return fail(error.status)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fail(404)
    if (error instanceof Error && /pixel limit/i.test(error.message)) return fail(413)
    if (error instanceof Error && /timeout/i.test(error.message)) return fail(408)
    return fail(415)
  } finally {
    clearTimeout(timeout)
    request.signal.removeEventListener('abort', abort)
    if (acquired) release()
  }
}


export async function serveImageDisplay(request: Request, source: DisplaySource): Promise<Response> {
  const response = await displayResponse(request, source)
  if (request.method !== 'HEAD') return response
  await response.body?.cancel()
  return new Response(null, { status: response.status, headers: response.headers })
}
