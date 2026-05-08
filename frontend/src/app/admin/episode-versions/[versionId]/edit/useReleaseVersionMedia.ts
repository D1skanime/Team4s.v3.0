'use client'

import { useCallback, useEffect, useState } from 'react'
import { getReleaseVersionMedia } from '@/lib/api'
import { ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'

export interface UseReleaseVersionMediaResult {
  items: ReleaseVersionMediaItem[]
  isLoading: boolean
  error: string | null
  reload: () => void
  // mutation helpers added by Plans 02 and 03
}

export function useReleaseVersionMedia(versionId: number | null): UseReleaseVersionMediaResult {
  const [items, setItems] = useState<ReleaseVersionMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (versionId === null) {
      setItems([])
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getReleaseVersionMedia(versionId)
      .then((response) => {
        if (cancelled) return
        setItems(response.data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [versionId, reloadKey])

  return { items, isLoading, error, reload }
}
