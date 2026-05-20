// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import {
  AUTH_SESSION_CHANGED_EVENT,
  AUTH_SESSION_EVENT_STORAGE_KEY,
  clearAuthSession,
  getRuntimeSessionMeta,
  parseRuntimeSessionSwitchEvent,
  persistAuthSession,
} from './api'
import { useAuthSession } from './useAuthSession'

describe('runtime session switch signaling', () => {
  beforeEach(() => {
    clearAuthSession()
    window.localStorage.removeItem(AUTH_SESSION_EVENT_STORAGE_KEY)
  })

  afterEach(() => {
    clearAuthSession()
    window.localStorage.removeItem(AUTH_SESSION_EVENT_STORAGE_KEY)
  })

  it('does not emit a session-switch event when the same app user logs in again', () => {
    persistAuthSession({
      token_type: 'Bearer',
      access_token: 'access-1',
      access_token_expires_at: 100,
      access_token_expires_in: 100,
      refresh_token: 'refresh-1',
      refresh_token_expires_at: 1000,
      refresh_token_expires_in: 1000,
      user_id: 7,
      app_user_id: 11,
      display_name: 'User A',
      session_id: 'session-a',
    })

    window.localStorage.removeItem(AUTH_SESSION_EVENT_STORAGE_KEY)

    persistAuthSession({
      token_type: 'Bearer',
      access_token: 'access-2',
      access_token_expires_at: 200,
      access_token_expires_in: 100,
      refresh_token: 'refresh-2',
      refresh_token_expires_at: 1100,
      refresh_token_expires_in: 1000,
      user_id: 7,
      app_user_id: 11,
      display_name: 'User A',
      session_id: 'session-a-2',
    })

    expect(window.localStorage.getItem(AUTH_SESSION_EVENT_STORAGE_KEY)).toBeNull()
    expect(getRuntimeSessionMeta()).toMatchObject({
      app_user_id: 11,
      session_id: 'session-a-2',
    })
  })

  it('emits a session-switch event when a different app user replaces the current session', () => {
    persistAuthSession({
      token_type: 'Bearer',
      access_token: 'access-a',
      access_token_expires_at: 100,
      access_token_expires_in: 100,
      refresh_token: 'refresh-a',
      refresh_token_expires_at: 1000,
      refresh_token_expires_in: 1000,
      user_id: 7,
      app_user_id: 11,
      display_name: 'User A',
      session_id: 'session-a',
    })

    persistAuthSession({
      token_type: 'Bearer',
      access_token: 'access-b',
      access_token_expires_at: 200,
      access_token_expires_in: 100,
      refresh_token: 'refresh-b',
      refresh_token_expires_at: 1100,
      refresh_token_expires_in: 1000,
      user_id: 8,
      app_user_id: 22,
      display_name: 'User B',
      session_id: 'session-b',
    })

    const rawEvent = window.localStorage.getItem(AUTH_SESSION_EVENT_STORAGE_KEY)
    expect(rawEvent).not.toBeNull()
    expect(parseRuntimeSessionSwitchEvent(rawEvent || '')).toMatchObject({
      type: 'session-switch',
      previous_app_user_id: 11,
      next_app_user_id: 22,
    })
    expect(getRuntimeSessionMeta()).toMatchObject({
      app_user_id: 22,
      session_id: 'session-b',
    })
  })

  it('resyncs token-free session snapshots on storage, custom, focus, and visibility events', async () => {
    const { result } = renderHook(() => useAuthSession())

    await waitFor(() => {
      expect(result.current.isClientInitialized).toBe(true)
    })
    expect(result.current.hasAccessToken).toBe(false)
    expect(result.current.authToken).toBe('')

    persistAuthSession({
      token_type: 'Bearer',
      access_token: 'access-a',
      access_token_expires_at: 100,
      access_token_expires_in: 100,
      refresh_token: 'refresh-a',
      refresh_token_expires_at: 1000,
      refresh_token_expires_in: 1000,
      user_id: 7,
      app_user_id: 11,
      display_name: 'User A',
      session_id: 'session-a',
    })

    act(() => {
      window.dispatchEvent(new Event('storage'))
    })

    await waitFor(() => {
      expect(result.current.hasAccessToken).toBe(true)
      expect(result.current.displayName).toBe('User A')
      expect(result.current.authToken).toBe('')
    })

    clearAuthSession({ broadcast: false })
    act(() => {
      window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
    })

    await waitFor(() => {
      expect(result.current.hasAccessToken).toBe(false)
      expect(result.current.hasRefreshToken).toBe(false)
    })

    persistAuthSession({
      token_type: 'Bearer',
      access_token: 'access-b',
      access_token_expires_at: 200,
      access_token_expires_in: 100,
      refresh_token: 'refresh-b',
      refresh_token_expires_at: 1100,
      refresh_token_expires_in: 1000,
      user_id: 8,
      app_user_id: 22,
      display_name: 'User B',
      session_id: 'session-b',
    })

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      expect(result.current.hasAccessToken).toBe(true)
      expect(result.current.displayName).toBe('User B')
    })

    clearAuthSession({ broadcast: false })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(result.current.hasAccessToken).toBe(false)
    })
  })
})
