'use client'

import { useCallback, useEffect, useState } from 'react'

import { AUTH_SESSION_CHANGED_EVENT, getAuthSessionSnapshot, logoutActiveAuthSession } from '@/lib/api'

export interface AuthSessionState {
  /**
   * Compatibility-only until Plan 49-03 removes existing prop threading.
   * This is deliberately always empty and never carries a runtime token.
   */
  authToken: ''
  hasAccessToken: boolean
  hasRefreshToken: boolean
  displayName: string
  isClientInitialized: boolean
}

function readAuthSessionState(isClientInitialized: boolean): AuthSessionState {
  const snapshot = getAuthSessionSnapshot()
  return {
    authToken: '',
    hasAccessToken: isClientInitialized && snapshot.hasAccessToken,
    hasRefreshToken: isClientInitialized && snapshot.hasRefreshToken,
    displayName: isClientInitialized ? snapshot.displayName : '',
    isClientInitialized,
  }
}

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(() => readAuthSessionState(false))

  useEffect(() => {
    const syncAuthState = () => setState(readAuthSessionState(true))
    syncAuthState()

    window.addEventListener('focus', syncAuthState)
    window.addEventListener('storage', syncAuthState)
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthState)
    document.addEventListener('visibilitychange', syncAuthState)

    return () => {
      window.removeEventListener('focus', syncAuthState)
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthState)
      document.removeEventListener('visibilitychange', syncAuthState)
    }
  }, [])

  return state
}

export function useLogoutAuthSession(): () => Promise<void> {
  return useCallback(() => logoutActiveAuthSession(), [])
}
