// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearRegistrationCompletion,
  consumeRegistrationCompletion,
  hasPendingRegistrationCompletion,
  markRegistrationCompleted,
} from './registrationCompletion'

describe('registrationCompletion one-shot marker', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('is absent by default', () => {
    expect(hasPendingRegistrationCompletion()).toBe(false)
    expect(consumeRegistrationCompletion()).toBe(false)
  })

  it('becomes pending after marking, without being consumed by a peek', () => {
    markRegistrationCompleted()

    expect(hasPendingRegistrationCompletion()).toBe(true)
    expect(hasPendingRegistrationCompletion()).toBe(true)
  })

  it('is consumed exactly once', () => {
    markRegistrationCompleted()

    expect(consumeRegistrationCompletion()).toBe(true)
    expect(consumeRegistrationCompletion()).toBe(false)
    expect(hasPendingRegistrationCompletion()).toBe(false)
  })

  it('does not survive an explicit clear, e.g. on cancellation or a failed exchange', () => {
    markRegistrationCompleted()
    clearRegistrationCompletion()

    expect(hasPendingRegistrationCompletion()).toBe(false)
    expect(consumeRegistrationCompletion()).toBe(false)
  })

  it('clearing an already-absent marker is a safe no-op', () => {
    expect(() => clearRegistrationCompletion()).not.toThrow()
    expect(hasPendingRegistrationCompletion()).toBe(false)
  })

  it('stores the marker under a session-scoped key that is not shared with persistent storage', () => {
    markRegistrationCompleted()

    expect(sessionStorage.getItem('team4s.registration.completed')).toBe('1')
    expect(localStorage.getItem('team4s.registration.completed')).toBeNull()
  })
})
