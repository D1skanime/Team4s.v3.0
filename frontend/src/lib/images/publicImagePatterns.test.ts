import { describe, expect, it } from 'vitest'

import { configuredApiMediaPatterns } from './publicImagePatterns.mjs'

describe('configuredApiMediaPatterns', () => {
  it('returns exactly one unchanged pattern for a valid NEXT_PUBLIC_API_URL value', () => {
    const patterns = configuredApiMediaPatterns('http://192.168.235.196:18092')

    expect(patterns).toEqual([
      {
        protocol: 'http',
        hostname: '192.168.235.196',
        port: '18092',
        pathname: '/api/v1/media/**',
      },
    ])
  })

  it('returns an empty array for empty/undefined/whitespace-only values (unchanged, no throw)', () => {
    expect(configuredApiMediaPatterns('')).toEqual([])
    expect(configuredApiMediaPatterns(undefined)).toEqual([])
    expect(configuredApiMediaPatterns('   ')).toEqual([])
  })

  it('throws a German fail-fast error naming the variable and the invalid value for a malformed URL', () => {
    expect(() => configuredApiMediaPatterns('not-a-valid-url')).toThrow(/NEXT_PUBLIC_API_URL/)
    expect(() => configuredApiMediaPatterns('not-a-valid-url')).toThrow(/not-a-valid-url/)
  })

  it('throws the same German fail-fast error for a second, differently malformed value', () => {
    expect(() => configuredApiMediaPatterns('relative/path/only')).toThrow(/NEXT_PUBLIC_API_URL/)
    expect(() => configuredApiMediaPatterns('relative/path/only')).toThrow(/relative\/path\/only/)
  })
})
