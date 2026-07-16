import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./route.ts', import.meta.url), 'utf8')

describe('private playback access relay', () => {
  it('uses the central refresh handoff and never caches personalized decisions', () => {
    expect(source).toContain('resolveAuthenticatedRelaySession')
    expect(source).toContain('AUTH_REFRESH_COOKIE_NAME')
    expect(source).toContain("'Cache-Control': 'private, no-store'")
    expect(source).toContain("Vary: 'Cookie'")
    expect(source).toContain('applyRefreshedAuthCookies')
  })
})
