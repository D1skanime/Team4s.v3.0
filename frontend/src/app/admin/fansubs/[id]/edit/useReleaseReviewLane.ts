import { useCallback, useEffect, useRef, useState } from 'react'

import { getReleaseReviewCounts, listReleaseReviews } from '@/lib/api'
import type {
  ReleaseReviewCounts,
  ReleaseReviewImageCategory,
  ReleaseReviewQueueItem,
  ReleaseReviewType,
  ReleaseReviewView,
} from '@/types/releaseReviews'

import { dedupeReleaseReviews, EMPTY_RELEASE_REVIEW_COUNTS } from '../../releaseReviewPresentation'

export interface UseReleaseReviewLaneOptions {
  fansubId: number
  view: ReleaseReviewView
  animeId: number | null
  releaseVersionId: number | null
  type: ReleaseReviewType | null
  category: ReleaseReviewImageCategory | null
  search: string
  enabled: boolean
}

export interface UseReleaseReviewLaneResult {
  items: ReleaseReviewQueueItem[]
  counts: ReleaseReviewCounts
  nextCursor: string | null
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  pageError: string | null
  reload: () => void
  loadMore: () => void
}

/**
 * Shared fetch/abort/sequence-guard/pagination behavior for a release-review lane
 * (a fansub-scoped, filtered, cursor-paginated list + counts pair). Extracted from
 * ReleaseReviewsSection.tsx so every lane -- the queue view and the own-pending view --
 * consumes identical data-fetching behavior instead of independently-written copies.
 */
export function useReleaseReviewLane(options: UseReleaseReviewLaneOptions): UseReleaseReviewLaneResult {
  const { fansubId, view, animeId, releaseVersionId, type, category, search, enabled } = options

  const [items, setItems] = useState<ReleaseReviewQueueItem[]>([])
  const [counts, setCounts] = useState<ReleaseReviewCounts>(EMPTY_RELEASE_REVIEW_COUNTS)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const initialAbortRef = useRef<AbortController | null>(null)
  const loadMoreAbortRef = useRef<AbortController | null>(null)

  const currentKey = `${fansubId}:${view}:${animeId ?? ''}:${releaseVersionId ?? ''}:${type ?? ''}:${category ?? ''}:${search}`

  const loadInitial = useCallback(async () => {
    if (!enabled) return
    const sequence = ++requestSequence.current
    initialAbortRef.current?.abort()
    loadMoreAbortRef.current?.abort()
    const controller = new AbortController()
    initialAbortRef.current = controller
    setIsLoading(true)
    setError(null)
    setPageError(null)
    try {
      const params = {
        view,
        animeId,
        releaseVersionId,
        type,
        category,
        search,
        limit: 50,
        signal: controller.signal,
      }
      const [page, countResponse] = await Promise.all([
        listReleaseReviews(fansubId, params),
        getReleaseReviewCounts(fansubId, {
          view,
          animeId,
          releaseVersionId,
          search,
          signal: controller.signal,
        }),
      ])
      if (sequence !== requestSequence.current) return
      setItems(dedupeReleaseReviews(page.data.items))
      setNextCursor(page.data.next_cursor ?? null)
      setCounts(countResponse.data)
    } catch {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      setError('Die Prüfungen konnten nicht geladen werden. Bitte versuche es erneut.')
    } finally {
      if (initialAbortRef.current === controller) initialAbortRef.current = null
      if (!controller.signal.aborted && sequence === requestSequence.current) setIsLoading(false)
    }
  }, [animeId, category, enabled, fansubId, releaseVersionId, search, type, view])

  useEffect(() => {
    void loadInitial()
    return () => {
      requestSequence.current += 1
      initialAbortRef.current?.abort()
      loadMoreAbortRef.current?.abort()
    }
  }, [currentKey, loadInitial])

  const loadMore = useCallback(() => {
    if (!nextCursor || isLoadingMore) return
    const sequence = requestSequence.current
    loadMoreAbortRef.current?.abort()
    const controller = new AbortController()
    loadMoreAbortRef.current = controller
    setIsLoadingMore(true)
    setPageError(null)
    void (async () => {
      try {
        const page = await listReleaseReviews(fansubId, {
          view,
          animeId,
          releaseVersionId,
          type,
          category,
          search,
          cursor: nextCursor,
          limit: 50,
          signal: controller.signal,
        })
        if (controller.signal.aborted || sequence !== requestSequence.current) return
        setItems((current) => dedupeReleaseReviews([...current, ...page.data.items]))
        setNextCursor(page.data.next_cursor ?? null)
      } catch {
        if (!controller.signal.aborted && sequence === requestSequence.current) {
          setPageError('Weitere Prüfungen konnten nicht geladen werden.')
        }
      } finally {
        if (loadMoreAbortRef.current === controller) loadMoreAbortRef.current = null
        if (!controller.signal.aborted && sequence === requestSequence.current) setIsLoadingMore(false)
      }
    })()
  }, [animeId, category, fansubId, isLoadingMore, nextCursor, releaseVersionId, search, type, view])

  const reload = useCallback(() => {
    void loadInitial()
  }, [loadInitial])

  return {
    items,
    counts,
    nextCursor,
    isLoading,
    isLoadingMore,
    error,
    pageError,
    reload,
    loadMore,
  }
}
