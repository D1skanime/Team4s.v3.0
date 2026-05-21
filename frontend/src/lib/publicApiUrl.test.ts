import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBrowserApiBaseUrl, resolvePublicApiUrl } from './publicApiUrl'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(currentDir, '..', '..')
const srcRoot = path.join(frontendRoot, 'src')

const serverBoundaryAllowlist = new Set([
  'src/app/api/episodes/[id]/play/route.ts',
  'src/app/api/releases/[id]/stream/route.ts',
])

function normalizeRelative(filePath: string): string {
  return path.relative(frontendRoot, filePath).replace(/\\/g, '/')
}

function walkFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') {
      continue
    }

    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath))
      continue
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.includes('.test.')) {
      files.push(fullPath)
    }
  }

  return files
}

describe('publicApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses same-origin paths when the configured browser API URL is empty', () => {
    expect(getBrowserApiBaseUrl('')).toBe('')
    expect(resolvePublicApiUrl('/api/v1/me')).toBe('/api/v1/me')
  })

  it('treats loopback API URLs as same-origin proxy candidates for Docker-live frontend use', () => {
    expect(getBrowserApiBaseUrl('http://127.0.0.1:8092')).toBe('')
    expect(getBrowserApiBaseUrl('http://localhost:8092')).toBe('')
    expect(resolvePublicApiUrl('/media/anime/1/banner.jpg', { width: 1280 })).toBe('/media/anime/1/banner.jpg?width=1280')
  })

  it('keeps non-loopback public API URLs for deployed browser targets', () => {
    expect(getBrowserApiBaseUrl('https://api.team4s.example')).toBe('https://api.team4s.example')
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.team4s.example')
    expect(resolvePublicApiUrl('/api/v1/me')).toBe('https://api.team4s.example/api/v1/me')
  })

  it('preserves absolute media URLs and appends query parameters', () => {
    expect(resolvePublicApiUrl('https://cdn.example/image.jpg', { quality: 86 })).toBe('https://cdn.example/image.jpg?quality=86')
  })

  it('keeps browser-facing production source free of direct loopback API fallbacks', () => {
    const violations = walkFiles(srcRoot)
      .map((filePath) => ({
        rel: normalizeRelative(filePath),
        source: fs.readFileSync(filePath, 'utf8'),
      }))
      .filter(({ rel }) => !serverBoundaryAllowlist.has(rel))
      .filter(({ source }) => /(?:localhost|127\.0\.0\.1):8092/.test(source))
      .map(({ rel }) => rel)

    expect(violations).toEqual([])
  })
})
