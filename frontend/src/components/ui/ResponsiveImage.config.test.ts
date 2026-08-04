import { describe, expect, it } from 'vitest'
import { hasLocalMatch } from 'next/dist/shared/lib/match-local-pattern'

import nextConfig from '../../../next.config.mjs'

const localPatterns = nextConfig.images?.localPatterns

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
})
