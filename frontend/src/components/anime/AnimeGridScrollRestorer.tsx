'use client'

import { useEffect } from 'react'

import { getGridScrollStorageKey } from '@/lib/animeGridContext'

interface AnimeGridScrollRestorerProps {
  gridQuery: string
}

export function AnimeGridScrollRestorer({ gridQuery }: AnimeGridScrollRestorerProps) {
  useEffect(() => {
    if (!gridQuery || typeof window === 'undefined') return

    const storageKey = getGridScrollStorageKey(gridQuery)
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return

    const y = Number.parseInt(raw, 10)
    if (Number.isFinite(y) && y >= 0) {
      window.scrollTo({
        top: y,
        behavior: 'auto',
      })
    }

    window.sessionStorage.removeItem(storageKey)
  }, [gridQuery])

  return null
}
