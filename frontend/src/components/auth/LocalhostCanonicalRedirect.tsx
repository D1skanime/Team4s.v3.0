'use client'

import { useEffect } from 'react'

const AUTH_RUNTIME_PROFILE = (process.env.NEXT_PUBLIC_RUNTIME_PROFILE || 'local').trim().toLowerCase()

function isLocalRuntimeProfile(profile: string): boolean {
  return profile === '' || profile === 'local' || profile === 'dev' || profile === 'development' || profile === 'test'
}

export function LocalhostCanonicalRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!isLocalRuntimeProfile(AUTH_RUNTIME_PROFILE)) {
      return
    }

    if (window.location.hostname !== 'localhost') {
      return
    }

    const targetUrl = new URL(window.location.href)
    targetUrl.hostname = '127.0.0.1'
    window.location.replace(targetUrl.toString())
  }, [])

  return null
}
