import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./route.ts', import.meta.url), 'utf8')

describe('bounded segment relay contract', () => {
  it('rejects caller-controlled bounds and requires a release-version binding', () => {
    for (const key of ['start', 'end', 'duration', 'startTimeTicks', 'endTimeTicks']) {
      expect(source).toContain(`'${key}'`)
    }
    expect(source).toContain("searchParams.get('release_version_id')")
    expect(source).toContain('releaseVersionID,')
  })

  it('keeps range forwarding and uses only the anonymous public grant seam', () => {
    expect(source).toContain("request.headers.get('range')")
    expect(source).toContain("headers.set('Range', range)")
    expect(source).toContain('resolvePublicSegmentRelayTarget')
    expect(source).not.toContain('cookies()')
    expect(source).not.toContain('AUTH_TOKEN_COOKIE_NAME')
    expect(source).not.toContain("headers.set('Authorization'")
    expect(source).not.toContain("searchParams.get('grant')")
  })

  it('contains upstream failures without exposing backend details', () => {
    expect(source).toContain("'stream nicht erreichbar'")
    expect(source).toContain('{ status: 502 }')
  })
})
