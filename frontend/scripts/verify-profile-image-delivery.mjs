#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EXPECTED_CLASSES = ['static-badge', 'profile-avatar', 'profile-hero', 'api-project', 'api-group']
const EXPECTED_CORE_WIDTHS = [128, 160, 512, 640]

function fail(message) {
  throw new Error(`phase120 image verifier: ${message}`)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) fail(`unexpected argument ${token}`)
    const key = token.slice(2)
    if (key.startsWith('require-') && ['alpha', 'cache-hit', 'original-fallback'].includes(key.slice(8))) {
      result[key] = true
      continue
    }
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) fail(`${token} requires a value`)
    if (key in result) fail(`duplicate option ${token}`)
    result[key] = value
    index += 1
  }
  return result
}

function exactCSV(raw, expected, label) {
  const actual = String(raw ?? '').split(',').filter(Boolean)
  assert(actual.length === expected.length && actual.every((value, index) => value === String(expected[index])), `${label} must be exactly ${expected.join(',')}`)
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function parseWebPDimensions(buffer) {
  assert(buffer.length >= 30, 'WEBP body is too short')
  assert(buffer.subarray(0, 4).toString('ascii') === 'RIFF', 'RIFF signature is absent at bytes 0-3')
  assert(buffer.subarray(8, 12).toString('ascii') === 'WEBP', 'WEBP signature is absent at bytes 8-11')

  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.subarray(offset, offset + 4).toString('ascii')
    const size = buffer.readUInt32LE(offset + 4)
    const payload = offset + 8
    if (chunk === 'VP8X' && payload + 10 <= buffer.length) {
      return { width: readUInt24LE(buffer, payload + 4) + 1, height: readUInt24LE(buffer, payload + 7) + 1 }
    }
    if (chunk === 'VP8L' && payload + 5 <= buffer.length) {
      assert(buffer[payload] === 0x2f, 'invalid VP8L signature')
      const b1 = buffer[payload + 1]
      const b2 = buffer[payload + 2]
      const b3 = buffer[payload + 3]
      const b4 = buffer[payload + 4]
      return {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      }
    }
    if (chunk === 'VP8 ' && payload + 10 <= buffer.length) {
      assert(buffer.subarray(payload + 3, payload + 6).equals(Buffer.from([0x9d, 0x01, 0x2a])), 'invalid VP8 frame signature')
      return {
        width: buffer.readUInt16LE(payload + 6) & 0x3fff,
        height: buffer.readUInt16LE(payload + 8) & 0x3fff,
      }
    }
    offset = payload + size + (size % 2)
  }
  fail('no supported WEBP dimension chunk found')
}

async function requestOptimized(baseURL, source, width) {
  const url = new URL('/_next/image', baseURL)
  url.searchParams.set('url', source)
  url.searchParams.set('w', String(width))
  url.searchParams.set('q', '75')
  const response = await fetch(url, { headers: { Accept: 'image/webp' } })
  const body = Buffer.from(await response.arrayBuffer())
  assert(response.status === 200, `${source} width ${width} returned HTTP ${response.status}: ${body.toString('utf8', 0, 160)}`)
  const mime = response.headers.get('content-type') ?? ''
  assert(mime.toLowerCase().startsWith('image/webp'), `${source} width ${width} returned MIME ${mime || '<missing>'}`)
  assert(!body.subarray(0, 256).toString('utf8').toLowerCase().includes('<html'), `${source} width ${width} returned HTML`)
  const dimensions = parseWebPDimensions(body)
  assert(dimensions.width === width, `${source} requested width ${width}, parsed ${dimensions.width}x${dimensions.height}`)
  return { body, dimensions, headers: response.headers }
}

function cacheEvidence(first, second, label) {
  assert(sha256(first.body) === sha256(second.body), `${label} repeated bytes differ`)
  const cache = second.headers.get('x-nextjs-cache')?.toUpperCase()
  const firstAgeRaw = first.headers.get('age')
  const secondAgeRaw = second.headers.get('age')
  const firstAge = firstAgeRaw === null ? null : Number(firstAgeRaw)
  const secondAge = secondAgeRaw === null ? null : Number(secondAgeRaw)
  const ageTransition = Number.isFinite(secondAge) && secondAge > (Number.isFinite(firstAge) ? firstAge : -1)
  assert(cache === 'HIT' || ageTransition, `${label} lacks a second-request cache HIT/age transition`)
}

function parsePam(buffer) {
  const marker = Buffer.from('ENDHDR\n')
  const headerEnd = buffer.indexOf(marker)
  assert(headerEnd > 0, 'decoded PAM header is absent')
  const header = buffer.subarray(0, headerEnd).toString('ascii')
  const readNumber = (name) => Number(header.match(new RegExp(`^${name}\\s+(\\d+)$`, 'm'))?.[1])
  const width = readNumber('WIDTH')
  const height = readNumber('HEIGHT')
  const depth = readNumber('DEPTH')
  assert(width > 0 && height > 0 && depth === 4, `decoded PAM must be RGBA, got ${width}x${height} depth ${depth}`)
  const pixels = buffer.subarray(headerEnd + marker.length)
  assert(pixels.length === width * height * depth, 'decoded PAM pixel length mismatch')
  return { width, height, depth, pixels }
}

function pixelAt(pam, x, y) {
  const offset = (y * pam.width + x) * pam.depth
  return [...pam.pixels.subarray(offset, offset + pam.depth)]
}

function verifyAlpha(webpPath, tempDir) {
  const info = execFileSync('webpinfo', [webpPath], { encoding: 'utf8' })
  assert(/Alpha:\s*1|ALPH/.test(info), 'webpinfo did not report alpha flag/chunk')
  const pamPath = join(tempDir, 'alpha-badge.pam')
  execFileSync('dwebp', [webpPath, '-pam', '-o', pamPath], { stdio: ['ignore', 'pipe', 'pipe'] })
  const pam = parsePam(readFileSync(pamPath))
  const transparentSamples = [
    [0, 0], [pam.width - 1, 0], [0, pam.height - 1], [pam.width - 1, pam.height - 1],
    [Math.floor(pam.width * 0.12), Math.floor(pam.height / 2)],
  ]
  for (const [x, y] of transparentSamples) {
    assert(pixelAt(pam, x, y)[3] === 0, `alpha edge sample ${x},${y} is not transparent`)
  }
  const center = pixelAt(pam, Math.floor(pam.width / 2), Math.floor(pam.height / 2))
  assert(center[3] === 255 && center[0] > 120 && center[2] > 80, 'alpha fixture center lost opacity/color')
}

function verifyOriginalFallback() {
  const output = execFileSync('node_modules/.bin/vitest', [
    'run', 'src/components/ui/ResponsiveImage.test.tsx', '--reporter=verbose',
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } })
  assert(output.includes('falls back exactly once to display original without geometry change'), 'fallback test did not execute the stable exactly-once contract')
}

async function run(args, tempDir) {
  exactCSV(args['require-url-classes'], EXPECTED_CLASSES, '--require-url-classes')
  exactCSV(args['require-widths'], EXPECTED_CORE_WIDTHS, '--require-widths')
  assert(args['require-alpha'] === true, '--require-alpha is mandatory')
  assert(args['require-cache-hit'] === true, '--require-cache-hit is mandatory')
  assert(args['require-original-fallback'] === true, '--require-original-fallback is mandatory')

  const baseURL = String(args['base-url'] ?? '')
  const fixtureOrigin = String(args['fixture-origin'] ?? '')
  assert(baseURL === 'http://127.0.0.1:3100', '--base-url must be exactly http://127.0.0.1:3100')
  assert(fixtureOrigin === 'http://127.0.0.1:3101', '--fixture-origin must be exactly http://127.0.0.1:3101')

  const cases = [
    { name: 'static-badge', source: '/__phase120-image-probe/alpha-badge.png', widths: [128, 160, 512, 640] },
    { name: 'profile-avatar', source: '/media/profile/phase120/avatar.png', widths: [128, 256] },
    { name: 'profile-hero', source: '/media/profile/phase120/hero.png', widths: [640, 1080, 1480, 1920] },
    { name: 'api-project', source: `${fixtureOrigin}/api/v1/media/phase120-project-cover.png`, widths: [96, 192] },
    { name: 'api-group', source: `${fixtureOrigin}/api/v1/media/phase120-group-logo.png`, widths: [64, 128] },
  ]
  const observedClasses = []
  const observedWidths = new Set()
  let alphaPath = ''

  for (const imageCase of cases) {
    observedClasses.push(imageCase.name)
    for (const width of imageCase.widths) {
      const first = await requestOptimized(baseURL, imageCase.source, width)
      const second = await requestOptimized(baseURL, imageCase.source, width)
      cacheEvidence(first, second, `${imageCase.name}@${width}`)
      observedWidths.add(width)
      const outputPath = join(tempDir, `${imageCase.name}-${width}.webp`)
      writeFileSync(outputPath, first.body)
      const info = execFileSync('webpinfo', [outputPath], { encoding: 'utf8' })
      assert(/Format:\s*Lossless|Format:\s*Lossy|VP8[ LX]/.test(info), `${imageCase.name}@${width} failed webpinfo`)
      if (imageCase.name === 'static-badge' && width === 160) alphaPath = outputPath
    }
  }

  assert(observedClasses.join(',') === EXPECTED_CLASSES.join(','), 'not all five URL classes ran')
  for (const width of EXPECTED_CORE_WIDTHS) assert(observedWidths.has(width), `required width ${width} was not observed`)
  assert(alphaPath, 'alpha probe output is missing')
  verifyAlpha(alphaPath, tempDir)
  verifyOriginalFallback()
  console.log(JSON.stringify({ ok: true, classes: observedClasses, widths: [...observedWidths].sort((a, b) => a - b) }))
}

const args = parseArgs(process.argv.slice(2))
const tempDir = mkdtempSync(join(tmpdir(), 'phase120-image-probe-'))
try {
  await run(args, tempDir)
} finally {
  assert(tempDir.startsWith(`${tmpdir()}/phase120-image-probe-`), 'refusing unsafe temp cleanup')
  rmSync(tempDir, { recursive: true, force: true })
  assert(!existsSync(tempDir), 'verifier temp cleanup failed')
}
