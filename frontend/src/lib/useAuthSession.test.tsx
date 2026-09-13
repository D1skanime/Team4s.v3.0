// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_SESSION_CHANGED_EVENT, clearAuthSession, getAuthSessionSnapshot, persistAuthSession } from './api'
import { useAuthSession } from './useAuthSession'

function seed(account: number, access = 'access', refresh = 'refresh') {
  persistAuthSession({
    token_type: 'Bearer', access_token: access, access_token_expires_at: 9999999999,
    access_token_expires_in: 3600, refresh_token: refresh,
    refresh_token_expires_at: 9999999999, refresh_token_expires_in: 7200,
    user_id: account, app_user_id: account, display_name: 'Gleicher Name', session_id: 'private-session',
  })
}

beforeEach(() => clearAuthSession())
afterEach(() => { cleanup(); vi.restoreAllMocks(); clearAuthSession() })

describe('token-free reactive auth session', () => {
  it.each([
    ['access', '', true, false], ['', 'refresh', false, true],
    ['access', 'refresh', true, true], ['', '', false, false],
  ])('exposes session presence for access=%s refresh=%s', (access, refresh, hasAccessToken, hasRefreshToken) => {
    seed(11, access, refresh)
    const { result } = renderHook(() => useAuthSession())
    expect(result.current).toMatchObject({ hasAccessToken, hasRefreshToken, isClientInitialized: true, accountIdentity: 11, accountGeneration: 0 })
    expect(Object.keys(getAuthSessionSnapshot()).sort()).toEqual(['accountIdentity', 'displayName', 'hasAccessToken', 'hasRefreshToken'])
    expect(JSON.stringify(result.current)).not.toContain('private-session')
    expect(result.current.authToken).toBe('')
  })

  it('observes account changes after mount with unchanged booleans and display name', () => {
    seed(11)
    const { result } = renderHook(() => useAuthSession())
    act(() => seed(22))
    expect(result.current.accountIdentity).toBe(22)
    act(() => clearAuthSession())
    expect(result.current).toMatchObject({ hasAccessToken: false, hasRefreshToken: false, accountIdentity: null })
    act(() => seed(33, '', 'refresh'))
    expect(result.current).toMatchObject({ hasAccessToken: false, hasRefreshToken: true, accountIdentity: 33 })
  })

  it('keeps the same account generation across token rotation, focus, storage and visibility', () => {
    seed(11)
    const { result } = renderHook(() => useAuthSession())
    const generation = result.current.accountGeneration
    act(() => {
      seed(11, 'rotated-access', 'rotated-refresh')
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('storage'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.accountIdentity).toBe(11)
    expect(result.current.accountGeneration).toBe(generation)
  })

  it.each(['missing', 'blocked'])('invalidates unknown %s metadata only on auth changes', (mode) => {
    seed(11)
    if (mode === 'missing') window.localStorage.removeItem('team4s.auth.session_meta')
    else vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked') })
    const { result } = renderHook(() => useAuthSession())
    expect(result.current.accountIdentity).toBeNull()
    expect(result.current.accountGeneration).toBe(0)
    act(() => {
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('storage'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.accountGeneration).toBe(0)
    act(() => {
      seed(22)
      if (mode === 'missing') {
        window.localStorage.removeItem('team4s.auth.session_meta')
        window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
      }
    })
    expect(result.current).toMatchObject({ accountIdentity: null, hasAccessToken: true, hasRefreshToken: true })
    expect(result.current.accountGeneration).toBe(1)
  })
})
