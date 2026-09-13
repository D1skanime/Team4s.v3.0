'use client'

import { useCallback, useEffect, useState } from 'react'

import { AUTH_SESSION_CHANGED_EVENT, getAuthSessionSnapshot, logoutActiveAuthSession } from '@/lib/api'

export interface AuthSessionState {
  /**
   * Compatibility-only until Plan 49-03 removes existing prop threading.
   * This is deliberately always empty and never carries a runtime token.
   */
  authToken: ''
  accountIdentity: number | null
  accountGeneration: number
  hasAccessToken: boolean
  hasRefreshToken: boolean
  displayName: string
  isClientInitialized: boolean
}

function readAuthSessionState(isClientInitialized: boolean): AuthSessionState {
  const snapshot = getAuthSessionSnapshot()
  return {
    authToken: '',
    accountIdentity: isClientInitialized ? snapshot.accountIdentity ?? null : null,
    accountGeneration: 0,
    hasAccessToken: isClientInitialized && snapshot.hasAccessToken,
    hasRefreshToken: isClientInitialized && snapshot.hasRefreshToken,
    displayName: isClientInitialized ? snapshot.displayName : '',
    isClientInitialized,
  }
}

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(() => readAuthSessionState(false))

  useEffect(() => {
    const syncAuthState = (event?: Event) => {
      const next = readAuthSessionState(true)
      setState((previous) => ({
        ...next,
        // With unreadable metadata an auth event is the only safe account boundary.
        // Focus and ordinary rotation of a known account do not invalidate consumers.
        accountGeneration: previous.accountGeneration + (
          event?.type === AUTH_SESSION_CHANGED_EVENT && next.accountIdentity === null ? 1 : 0
        ),
      }))
    }
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
