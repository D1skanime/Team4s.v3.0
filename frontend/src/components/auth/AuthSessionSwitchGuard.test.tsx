// @vitest-environment jsdom

import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthSessionSwitchGuard } from './AuthSessionSwitchGuard'

const replaceMock = vi.fn()
const reloadMock = vi.fn()

describe('AuthSessionSwitchGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/admin/anime',
        replace: replaceMock,
        reload: reloadMock,
      },
    })

    window.localStorage.setItem('team4s.auth.session_meta', JSON.stringify({
      app_user_id: 11,
      user_id: 7,
      display_name: 'User A',
      session_id: 'session-a',
    }))
    window.localStorage.setItem('team4s.auth.access_token', 'token-a')
    window.localStorage.setItem('team4s.auth.refresh_token', 'refresh-a')
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('clears local auth state and redirects to /auth after a cross-tab session switch', async () => {
    render(<AuthSessionSwitchGuard />)

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'team4s.auth.session_event',
      newValue: JSON.stringify({
        type: 'session-switch',
        timestamp: Date.now(),
        previous_app_user_id: 11,
        next_app_user_id: 22,
      }),
    }))

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/auth')
    })

    expect(window.localStorage.getItem('team4s.auth.access_token')).toBeNull()
    expect(window.localStorage.getItem('team4s.auth.refresh_token')).toBeNull()
    expect(window.localStorage.getItem('team4s.auth.session_meta')).toBeNull()
  })
})
