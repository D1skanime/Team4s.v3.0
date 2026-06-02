'use client'

import { useEffect } from 'react'

import {
  AUTH_SESSION_EVENT_STORAGE_KEY,
  AUTH_SESSION_SWITCH_CHANNEL_NAME,
  clearAuthSession,
  getRuntimeSessionMeta,
  type RuntimeSessionSwitchEvent,
  parseRuntimeSessionSwitchEvent,
} from '@/lib/api'

export function AuthSessionSwitchGuard() {
  useEffect(() => {
    const forceLogout = () => {
      clearAuthSession({ broadcast: false })
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
        return
      }

      window.location.reload()
    }

    const handleSwitch = (switchEvent: RuntimeSessionSwitchEvent | null) => {
      if (!switchEvent) {
        return
      }

      const currentSession = getRuntimeSessionMeta()
      if (!currentSession || currentSession.app_user_id <= 0) {
        return
      }

      if (currentSession.app_user_id === switchEvent.next_app_user_id) {
        return
      }

      forceLogout()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SESSION_EVENT_STORAGE_KEY || typeof event.newValue !== 'string') {
        return
      }

      handleSwitch(parseRuntimeSessionSwitchEvent(event.newValue))
    }

    let channel: BroadcastChannel | null = null
    window.addEventListener('storage', handleStorage)
    try {
      channel = new BroadcastChannel(AUTH_SESSION_SWITCH_CHANNEL_NAME)
      channel.onmessage = (event: MessageEvent<RuntimeSessionSwitchEvent>) => handleSwitch(event.data)
    } catch {
      channel = null
    }

    return () => {
      window.removeEventListener('storage', handleStorage)
      channel?.close()
    }
  }, [])

  return null
}
