// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  AUTH_DISPLAY_NAME_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  AUTH_TOKEN_COOKIE_NAME,
  clearAuthSession,
  persistAuthSession,
} from './api'

function setBrowserProtocol(protocol: 'https:' | 'http:', hostname = 'team4s.local'): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      protocol,
      hostname,
      href: `${protocol}//${hostname}/`,
    },
  })
}

function rawCookieAssignments(): string[] {
  // jsdom's document.cookie getter only ever returns the merged "name=value"
  // pairs, never the attributes a write appended (Path/Max-Age/SameSite/Secure).
  // To assert on those attributes we capture every raw assignment string
  // passed to the document.cookie setter instead of reading it back.
  return capturedAssignments.slice()
}

let capturedAssignments: string[] = []
let originalCookieDescriptor: PropertyDescriptor | undefined

function installCookieCapture(): void {
  capturedAssignments = []
  originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    ?? Object.getOwnPropertyDescriptor(document, 'cookie')

  const store = new Map<string, string>()

  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get() {
      return Array.from(store.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
    },
    set(rawAssignment: string) {
      capturedAssignments.push(rawAssignment)
      const [pair] = rawAssignment.split(';')
      const separatorIndex = pair.indexOf('=')
      if (separatorIndex === -1) return
      const name = pair.slice(0, separatorIndex).trim()
      const value = pair.slice(separatorIndex + 1).trim()
      const maxAgeMatch = /Max-Age=(-?\d+)/i.exec(rawAssignment)
      if (maxAgeMatch && Number(maxAgeMatch[1]) <= 0) {
        store.delete(name)
        return
      }
      store.set(name, value)
    },
  })
}

function restoreCookieCapture(): void {
  if (originalCookieDescriptor) {
    Object.defineProperty(document, 'cookie', originalCookieDescriptor)
  }
  capturedAssignments = []
}

function findAssignment(name: string): string | undefined {
  return rawCookieAssignments()
    .slice()
    .reverse()
    .find((assignment) => assignment.startsWith(`${name}=`))
}

function seedSession(): void {
  const nowSeconds = Math.floor(Date.now() / 1000)
  persistAuthSession({
    token_type: 'Bearer',
    access_token: 'access-token-1',
    access_token_expires_at: nowSeconds + 3600,
    access_token_expires_in: 3600,
    refresh_token: 'refresh-token-1',
    refresh_token_expires_at: nowSeconds + 7200,
    refresh_token_expires_in: 7200,
    user_id: 7,
    display_name: 'Cookie Tester',
  })
}

describe('central auth-cookie writes are protocol-aware', () => {
  beforeEach(() => {
    installCookieCapture()
  })

  afterEach(() => {
    clearAuthSession()
    restoreCookieCapture()
  })

  it('appends Secure to every auth cookie write over HTTPS', () => {
    setBrowserProtocol('https:', 'team4s.example')
    seedSession()

    const accessAssignment = findAssignment(AUTH_TOKEN_COOKIE_NAME)
    const refreshAssignment = findAssignment(AUTH_REFRESH_COOKIE_NAME)
    const displayNameAssignment = findAssignment(AUTH_DISPLAY_NAME_COOKIE_NAME)

    expect(accessAssignment).toBeDefined()
    expect(refreshAssignment).toBeDefined()
    expect(displayNameAssignment).toBeDefined()

    for (const assignment of [accessAssignment, refreshAssignment, displayNameAssignment]) {
      expect(assignment).toContain('; Secure')
      expect(assignment).toContain('Path=/')
      expect(assignment).toMatch(/Max-Age=\d+/)
      expect(assignment).toContain('SameSite=Lax')
    }
  })

  it('omits Secure for plain http://127.0.0.1 local development', () => {
    setBrowserProtocol('http:', '127.0.0.1')
    seedSession()

    const accessAssignment = findAssignment(AUTH_TOKEN_COOKIE_NAME)
    const refreshAssignment = findAssignment(AUTH_REFRESH_COOKIE_NAME)
    const displayNameAssignment = findAssignment(AUTH_DISPLAY_NAME_COOKIE_NAME)

    expect(accessAssignment).toBeDefined()
    expect(refreshAssignment).toBeDefined()
    expect(displayNameAssignment).toBeDefined()

    for (const assignment of [accessAssignment, refreshAssignment, displayNameAssignment]) {
      expect(assignment).not.toContain('Secure')
      expect(assignment).toContain('Path=/')
      expect(assignment).toMatch(/Max-Age=\d+/)
      expect(assignment).toContain('SameSite=Lax')
    }
  })

  it('omits Secure for any other plain-http hostname, not only 127.0.0.1', () => {
    setBrowserProtocol('http:', 'localhost')
    seedSession()

    const accessAssignment = findAssignment(AUTH_TOKEN_COOKIE_NAME)
    expect(accessAssignment).toBeDefined()
    expect(accessAssignment).not.toContain('Secure')
  })

  it('applies the same protocol rule to clear/logout writes over HTTPS', () => {
    setBrowserProtocol('https:', 'team4s.example')
    seedSession()
    capturedAssignments = []

    clearAuthSession()

    const accessAssignment = findAssignment(AUTH_TOKEN_COOKIE_NAME)
    const refreshAssignment = findAssignment(AUTH_REFRESH_COOKIE_NAME)
    const displayNameAssignment = findAssignment(AUTH_DISPLAY_NAME_COOKIE_NAME)

    expect(accessAssignment).toBeDefined()
    expect(refreshAssignment).toBeDefined()
    expect(displayNameAssignment).toBeDefined()

    for (const assignment of [accessAssignment, refreshAssignment, displayNameAssignment]) {
      expect(assignment).toContain('; Secure')
      expect(assignment).toMatch(/Max-Age=0\b/)
    }
  })

  it('applies the same protocol rule to clear/logout writes over plain HTTP', () => {
    setBrowserProtocol('http:', '127.0.0.1')
    seedSession()
    capturedAssignments = []

    clearAuthSession()

    const accessAssignment = findAssignment(AUTH_TOKEN_COOKIE_NAME)
    const refreshAssignment = findAssignment(AUTH_REFRESH_COOKIE_NAME)
    const displayNameAssignment = findAssignment(AUTH_DISPLAY_NAME_COOKIE_NAME)

    expect(accessAssignment).toBeDefined()
    expect(refreshAssignment).toBeDefined()
    expect(displayNameAssignment).toBeDefined()

    for (const assignment of [accessAssignment, refreshAssignment, displayNameAssignment]) {
      expect(assignment).not.toContain('Secure')
      expect(assignment).toMatch(/Max-Age=0\b/)
    }
  })
})
