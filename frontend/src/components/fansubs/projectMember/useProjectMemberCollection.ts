'use client'

import { useCallback, useEffect, useState } from 'react'

import type { CursorPage } from '@/types/releaseDetail'

interface FetchParams {
  cursor?: string
  limit?: number
  signal?: AbortSignal
}

interface Options<T> {
  initialLimit: number
  pageLimit: number
  // key und fetchPage MUESSEN vom Aufrufer via useCallback stabilisiert werden, sonst laeuft der
  // Initial-Effekt bei jedem Render neu.
  key: (item: T) => number | string
  fetchPage: (params: FetchParams) => Promise<CursorPage<T>>
}

interface Result<T> {
  shown: T[]
  loadedCount: number
  loading: boolean
  error: boolean
  canShowMore: boolean
  canShowLess: boolean
  showMore: () => void
  showLess: () => void
}

// Gemeinsame Cursor-Nachlade-Logik der drei Projekt-Member-Sektionen (Texte/Bilder/Releases).
// `visible` entkoppelt Anzeige von geladenen Items: "Weniger anzeigen" reduziert nur die Anzeige,
// "Weitere laden" zeigt erst gepufferte Items, danach lädt es serverseitig nach.
// append ist REIN (Dedup aus prev, kein externer Ref) — StrictMode-sicher (siehe Bugfix).
export function useProjectMemberCollection<T>({
  initialLimit,
  pageLimit,
  key,
  fetchPage,
}: Options<T>): Result<T> {
  const [items, setItems] = useState<T[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(initialLimit)

  const append = useCallback(
    (incoming: T[]) => {
      setItems((prev) => {
        const existing = new Set(prev.map(key))
        const additions = incoming.filter((item) => !existing.has(key(item)))
        return additions.length > 0 ? [...prev, ...additions] : prev
      })
    },
    [key],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchPage({ limit: initialLimit, signal: controller.signal })
      .then((page) => {
        append(page.items)
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name !== 'AbortError') setError(true)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [initialLimit, fetchPage, append])

  const showMore = useCallback(() => {
    // Zuerst bereits geladene (gepufferte) Items einblenden.
    if (visible < items.length) {
      setVisible((current) => Math.min(current + pageLimit, items.length))
      return
    }
    if (!cursor || !hasMore || loading) return
    setLoading(true)
    fetchPage({ cursor, limit: pageLimit })
      .then((page) => {
        append(page.items)
        setCursor(page.next_cursor)
        setHasMore(page.has_more)
        setVisible((current) => current + pageLimit)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [items.length, visible, cursor, hasMore, loading, pageLimit, append, fetchPage])

  const showLess = useCallback(() => {
    setVisible((current) => Math.max(initialLimit, current - pageLimit))
  }, [initialLimit, pageLimit])

  const shown = items.slice(0, visible)
  const canShowMore = visible < items.length || hasMore
  const canShowLess = shown.length > initialLimit

  return {
    shown,
    loadedCount: items.length,
    loading,
    error,
    canShowMore,
    canShowLess,
    showMore,
    showLess,
  }
}
