import { describe, expect, it } from 'vitest'
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
    const allowed = new URL('/api/v1/media/files/group-logo.png', runtimeBase)
    const disallowedPath = new URL('/api/v1/admin/users', runtimeBase)
    const disallowedHost = new URL(allowed)
    disallowedHost.hostname = 'example.invalid'

    expect(hasRemoteMatch([], remotePatterns, allowed)).toBe(true)
    expect(hasRemoteMatch([], remotePatterns, disallowedPath)).toBe(false)
    expect(hasRemoteMatch([], remotePatterns, disallowedHost)).toBe(false)
  })
})
