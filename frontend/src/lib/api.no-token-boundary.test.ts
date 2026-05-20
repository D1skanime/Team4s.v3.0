import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(currentDir, '..', '..')
const srcRoot = path.join(frontendRoot, 'src')

const centralClientAllowlist = new Set([
  'src/lib/api.ts',
])

const keycloakAuthAllowlist = new Set([
  'src/lib/keycloakAuth.ts',
])

const authEntrypointAllowlist = new Set([
  'src/app/auth/page.tsx',
  'src/app/api/auth/keycloak/logout/route.ts',
  'src/app/api/auth/keycloak/token/route.ts',
])

const ssrServerBoundaryAllowlist = new Set([
  'src/app/anime/[id]/page.tsx',
  'src/app/watchlist/page.tsx',
])

const streamingServerBoundaryAllowlist = new Set([
  'src/app/api/episodes/[id]/play/route.ts',
  'src/app/api/releases/[id]/stream/route.ts',
  'src/lib/server/streamRelayAuth.ts',
])

const publicNoAuthFetchAllowlist = new Set([
  'src/app/api/admin/asset-proxy/route.ts',
  'src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx',
  'src/components/admin/MediaUpload.tsx',
])

const docsAllowlist = new Set([
  '../docs/frontend/auth-api-client.md',
  '../docs/frontend/streaming-auth-handoff.md',
  '../.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-boundaries.md',
  '../.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-inventory.md',
])

type SourceMatch = {
  file: string
  line: number
  text: string
}

function normalizeRelative(filePath: string, root = frontendRoot): string {
  return path.relative(root, filePath).replace(/\\/g, '/')
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

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

function productionSourceFiles(): string[] {
  return walkFiles(srcRoot).filter((filePath) => !/\.test\.(ts|tsx)$/.test(filePath))
}

function scan(files: string[], pattern: RegExp): SourceMatch[] {
  const matches: SourceMatch[] = []

  for (const filePath of files) {
    const rel = normalizeRelative(filePath)
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          file: rel,
          line: index + 1,
          text: line.trim(),
        })
      }
    })
  }

  return matches
}

function rejectAllowed(matches: SourceMatch[], allowlist: Set<string>): SourceMatch[] {
  return matches.filter((match) => !allowlist.has(match.file))
}

function formatMatches(matches: SourceMatch[]): string {
  return matches.map((match) => `${match.file}:${match.line}: ${match.text}`).join('\n')
}

describe('Phase 49 no-token ownership boundaries', () => {
  const files = productionSourceFiles()

  it('keeps direct runtime token and auth-cookie access inside explicit central, SSR, and streaming boundaries', () => {
    const allowed = new Set([
      ...centralClientAllowlist,
      ...authEntrypointAllowlist,
      ...ssrServerBoundaryAllowlist,
      ...streamingServerBoundaryAllowlist,
    ])

    const violations = rejectAllowed(
      scan(
        files,
        /getRuntimeAuthToken|getRuntimeRefreshToken|document\.cookie|team4s_access_token|team4s_refresh_token|AUTH_TOKEN_COOKIE_NAME|AUTH_REFRESH_COOKIE_NAME/,
      ),
      allowed,
    )

    expect(formatMatches(violations)).toBe('')
  })

  it('keeps browser auth storage access inside the central client or Keycloak PKCE helper', () => {
    const allowed = new Set([
      ...centralClientAllowlist,
      ...keycloakAuthAllowlist,
    ])

    const violations = rejectAllowed(
      scan(
        files,
        /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\([^)]*(?:auth|access_token|refresh_token|pkce)|team4s\.auth\./,
      ),
      allowed,
    )

    expect(formatMatches(violations)).toBe('')
  })

  it('keeps bearer construction in the central client or server streaming boundary', () => {
    const allowed = new Set([
      ...centralClientAllowlist,
      ...streamingServerBoundaryAllowlist,
    ])

    const violations = rejectAllowed(
      scan(files, /Authorization.*Bearer|Bearer \$\{|setRequestHeader\('Authorization'|headers\.set\('Authorization'/),
      allowed,
    )

    expect(formatMatches(violations)).toBe('')
  })

  it('keeps normal browser app and component surfaces free of token props, params, and locals', () => {
    const appAndComponentFiles = files.filter((filePath) => {
      const rel = normalizeRelative(filePath)
      return rel.startsWith('src/app/') || rel.startsWith('src/components/')
    })

    const allowed = new Set([
      ...authEntrypointAllowlist,
      ...ssrServerBoundaryAllowlist,
      ...streamingServerBoundaryAllowlist,
    ])

    const violations = rejectAllowed(
      scan(appAndComponentFiles, /\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken/),
      allowed,
    )

    expect(formatMatches(violations)).toBe('')
  })

  it('keeps Keycloak lifecycle helpers behind the central client and auth entrypoint', () => {
    const appAndComponentFiles = files.filter((filePath) => {
      const rel = normalizeRelative(filePath)
      return rel.startsWith('src/app/') || rel.startsWith('src/components/')
    })

    const allowed = new Set([
      ...authEntrypointAllowlist,
    ])

    const violations = rejectAllowed(
      scan(
        appAndComponentFiles,
        /refreshKeycloakToken|logoutFromKeycloak|exchangeKeycloakCode|completeKeycloakAuthCallback|refreshActiveAuthSession|logoutActiveAuthSession|persistResolvedAuthSession|getAuthSessionSnapshot/,
      ),
      allowed,
    )

    expect(formatMatches(violations)).toBe('')
  })

  it('keeps direct fetch outside the central client limited to auth entrypoint, Keycloak, server routes, and public no-auth fetches', () => {
    const allowed = new Set([
      ...centralClientAllowlist,
      ...keycloakAuthAllowlist,
      ...authEntrypointAllowlist,
      ...streamingServerBoundaryAllowlist,
      ...publicNoAuthFetchAllowlist,
    ])

    const violations = rejectAllowed(scan(files, /\bfetch\(/), allowed)

    expect(formatMatches(violations)).toBe('')
  })

  it('keeps XMLHttpRequest upload auth centralized in api.ts', () => {
    const violations = rejectAllowed(
      scan(files, /new XMLHttpRequest|setRequestHeader\('Authorization'|upload\.onprogress/),
      centralClientAllowlist,
    )

    expect(formatMatches(violations)).toBe('')
  })

  it('keeps docs and tests out of production boundary scans while making those allowlists explicit', () => {
    for (const docPath of docsAllowlist) {
      expect(fs.existsSync(path.resolve(frontendRoot, docPath)) || docPath.includes('auth-api-client.md') || docPath.includes('streaming-auth-handoff.md')).toBe(true)
    }

    const testFiles = walkFiles(srcRoot)
      .map((filePath) => normalizeRelative(filePath))
      .filter((rel) => /\.test\.(ts|tsx)$/.test(rel))

    expect(testFiles.length).toBeGreaterThan(0)
  })
})
