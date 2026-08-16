import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasLocalMatch } from 'next/dist/shared/lib/match-local-pattern'
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern'

import nextConfig from '../../../next.config.mjs'

const localPatterns = nextConfig.images?.localPatterns
const remotePatterns = nextConfig.images?.remotePatterns ?? []

describe('ResponsiveImage profile-media configuration', () => {
  it.each([
    [
      '/media/profile/1/background/b58e44b7-f543-4c43-a605-d9a4e68d0866/original.jpg',
    ],
    [
      '/media/profile/41/avatar/9ad8ec02-43e7-4858-b3d7-258b3e44a3a9/original.png',
    ],
  ])(
    'allows persisted public profile image URL %s through the Next optimizer',
    (publicURL) => {
      expect(hasLocalMatch(localPatterns, publicURL)).toBe(true)
    },
  )

  it('allows the production badge namespace without opening unrelated static paths', () => {
    expect(hasLocalMatch(localPatterns, '/member-achievement-badges/role-project_lead-motif.png')).toBe(true)
    expect(hasLocalMatch(localPatterns, '/history-event-badges-transparent/unrelated.png')).toBe(false)
  })

  it('allows public release-version contribution media without opening all media paths', () => {
    expect(hasLocalMatch(localPatterns, '/media/release-version/1/asset/original.jpg')).toBe(true)
    expect(hasLocalMatch(localPatterns, '/media/admin/private/original.jpg')).toBe(false)
  })

  it('allows only the configured Team4s API media namespace for responsive group logos', () => {
    const runtimeBase = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.235.196:18092'
    const allowedFile = new URL('/api/v1/media/files/group-logo.png', runtimeBase)
    const allowedJellyfinQuery = new URL(
      '/api/v1/media/image?item_id=series-1&kind=primary&provider=jellyfin',
      runtimeBase,
    )
    const disallowedPath = new URL('/api/v1/admin/users', runtimeBase)
    const disallowedHost = new URL(allowedFile)
    disallowedHost.hostname = 'example.invalid'

    expect(hasRemoteMatch([], remotePatterns, allowedFile)).toBe(true)
    expect(hasRemoteMatch([], remotePatterns, allowedJellyfinQuery)).toBe(true)
    expect(hasRemoteMatch([], remotePatterns, disallowedPath)).toBe(false)
    expect(hasRemoteMatch([], remotePatterns, disallowedHost)).toBe(false)
  })

  it('still allows the persisted /media/** public profile image namespace after the env-gate edit', () => {
    expect(hasLocalMatch(localPatterns, '/media/profile/1/avatar/x/original.png')).toBe(true)
  })

  it('bounds next/image quality to an explicit, sane allow-list', () => {
    const qualities = nextConfig.images?.qualities ?? []

    expect(qualities).toContain(75)
    for (const quality of qualities) {
      expect(quality).toBeGreaterThanOrEqual(1)
      expect(quality).toBeLessThanOrEqual(100)
    }
  })
})

// Built as a runtime string (not a literal) so TypeScript does not attempt
// static module resolution on the cache-busting query suffix.
function reimportConfig(cacheBustTag: string): Promise<{ default: typeof nextConfig }> {
  const specifier: string = `../../../next.config.mjs?env-gate-${cacheBustTag}`
  return import(specifier)
}

describe('ResponsiveImage dangerouslyAllowLocalIP environment gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('disallows local-IP image optimization in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()

    const { default: productionConfig } = await reimportConfig('production')

    expect(productionConfig.images?.dangerouslyAllowLocalIP).toBe(false)
  })

  it('allows local-IP image optimization in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.resetModules()

    const { default: developmentConfig } = await reimportConfig('development')

    expect(developmentConfig.images?.dangerouslyAllowLocalIP).toBe(true)
  })

  it('allows local-IP image optimization in test', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.resetModules()

    const { default: testConfig } = await reimportConfig('test')

    expect(testConfig.images?.dangerouslyAllowLocalIP).toBe(true)
  })

  it('allows local-IP image optimization in production ONLY under the explicit PHASE120_IMAGE_PROBE=1 opt-in', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PHASE120_IMAGE_PROBE', '1')
    vi.resetModules()

    const { default: probeConfig } = await reimportConfig('production-probe-opt-in')

    expect(probeConfig.images?.dangerouslyAllowLocalIP).toBe(true)
  })

  it('still disallows local-IP image optimization in production when PHASE120_IMAGE_PROBE is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()

    const { default: productionConfig } = await reimportConfig('production-no-probe')

    expect(productionConfig.images?.dangerouslyAllowLocalIP).toBe(false)
  })
})
