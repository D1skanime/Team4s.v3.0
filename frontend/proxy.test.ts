import { readFileSync } from 'node:fs'

import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { config, proxy } from './proxy'

function canonicalizeMemberRequest(input: string) {
  const response = proxy(new NextRequest(input))
  const location = response.headers.get('location')
  return location ? { location, status: response.status } : null
}

describe('Phase 128 canonical public-member URL contract', () => {
  it.each([
    ['case', 'https://team4s.test/members/Sheppert', 'https://team4s.test/members/sheppert'],
    ['plain edge whitespace', 'https://team4s.test/members/ Sheppert ', 'https://team4s.test/members/sheppert'],
    ['encoded edge whitespace', 'https://team4s.test/members/%09Sheppert%20', 'https://team4s.test/members/sheppert'],
    ['equivalent one-segment encoding', 'https://team4s.test/members/%73heppert', 'https://team4s.test/members/sheppert'],
    ['query preservation', 'https://team4s.test/members/SHEPPERT?tab=projects&from=ranking', 'https://team4s.test/members/sheppert?tab=projects&from=ranking'],
    ['descendant path', 'https://team4s.test/members/SHEPPERT/projects/42?from=profile', 'https://team4s.test/members/sheppert/projects/42?from=profile'],
  ])('redirects canonical-equivalent %s with 308', (_name, input, location) => {
    expect(canonicalizeMemberRequest(input)).toEqual({ location, status: 308 })
  })

  it.each([
    ['already canonical', 'https://team4s.test/members/sheppert'],
    ['encoded slash', 'https://team4s.test/members/sheppert%2Fadmin'],
    ['encoded backslash', 'https://team4s.test/members/sheppert%5Cadmin'],
    ['control input', 'https://team4s.test/members/sheppert%00admin'],
    ['malformed encoding', 'https://team4s.test/members/sheppert%ZZ'],
    ['double-encoded separator', 'https://team4s.test/members/sheppert%252Fadmin'],
    ['non-ASCII input', 'https://team4s.test/members/M%C3%BCller'],
    ['internal whitespace', 'https://team4s.test/members/sheppert%20admin'],
    ['unusable input', 'https://team4s.test/members/%20%09'],
    ['numeric input', 'https://team4s.test/members/123'],
  ])('does not redirect %s', (_name, input) => {
    expect(canonicalizeMemberRequest(input)).toBeNull()
  })

  it('is syntax-only and preserves identical behavior for missing and private guesses', () => {
    expect(canonicalizeMemberRequest('https://team4s.test/members/Guessed-New-Nickname?source=profile')).toEqual({
      location: 'https://team4s.test/members/guessed-new-nickname?source=profile',
      status: 308,
    })
    expect(canonicalizeMemberRequest('https://team4s.test/members/Private-Member?source=profile')).toEqual({
      location: 'https://team4s.test/members/private-member?source=profile',
      status: 308,
    })
  })

  it('uses only the Next proxy boundary for member paths', () => {
    const source = readFileSync(new URL('./proxy.ts', import.meta.url), 'utf8')

    expect(config).toEqual({ matcher: '/members/:path*' })
    expect(source).not.toMatch(/apiClient|authorizedFetch|getMemberProfile|fetch\s*\(|database|nickname/i)
  })

  it('defines one privacy-neutral unavailable presentation without identity hints', () => {
    const unavailable = {
      title: 'Profil nicht verfügbar | Team4s',
      heading: 'Profil nicht verfügbar',
      body: 'Dieses Profil ist nicht verfügbar. Prüfe den Link oder kehre zur Anime-Übersicht zurück.',
      action: { href: '/anime', label: 'Zur Anime-Übersicht' },
      robots: { index: false, follow: false },
    }
    expect(JSON.stringify(unavailable)).not.toMatch(/sheppert|nickname|anmeld|privat|bearbeiten|korrektur/i)
    expect(unavailable.robots).toEqual({ index: false, follow: false })
  })
})
