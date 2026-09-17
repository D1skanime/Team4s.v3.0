'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getGroupedEpisodes } from '@/lib/api'
import type { PublicGroupedEpisode, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'

type Pagination = PublicGroupedEpisodesResponse['data']['pagination']

export interface WindowedPage {
  id: string
  /** The cursor originally used to fetch this page; null for the first page. Retained forever
   * (in pageMeta, decoupled from pageCache eviction) so a cache-miss restore never invents a
   * synthetic cursor -- it always re-issues the exact request that produced this page. */
  cursorUsedToFetch: string | null
  episodes: PublicGroupedEpisode[]
  pagination: Pagination
}

// CACHE_MAX_PAGES=6: 6 pages * ~15.9KB/page (164-RESEARCH.md's projected full public-page
// size) is roughly 95KB of retained JSON -- trivial compared to unbounded retention of all
// ~10 pages for a 220-episode anime, while still comfortably covering "scroll down 2 pages,
// scroll back up" without a re-fetch (D-33).
const CACHE_MAX_PAGES = 6
// DOM_WINDOW_SIZE=3: bounds mounted glass/blur surfaces (D-30/D-45) regardless of how many
// pages have been loaded overall -- only the active window is ever fully rendered.
const DOM_WINDOW_SIZE = 3

interface PageMeta {
  cursorUsedToFetch: string | null
}

interface CoreState {
  /** Every page id ever produced this filter-session, in fetch order (oldest first). */
  orderedPageIds: string[]
  /** Contiguous slice of orderedPageIds currently fully rendered (<= DOM_WINDOW_SIZE). */
  domWindowPageIds: string[]
  pageCache: Map<string, WindowedPage>
  pageMeta: Map<string, PageMeta>
  /** heightPx captured just before a page left domWindowPageIds. */
  spacers: Map<string, number>
  /** Ids restored into domWindowPageIds but not yet re-measured (awaiting the post-restore
   * reportPageHeight call so a scrollAnchorAdjustment can be computed). */
  pendingRestoreIds: Set<string>
  episodeCount: number
}

interface AnchorAdjustment {
  px: number
  seq: number
}

interface UseWindowedEpisodePagesParams {
  animeID: number
  initialEpisodes: PublicGroupedEpisode[]
  initialPagination: Pagination | undefined
  activeFansubSlug: string | null
  initialEpisodeCount?: number
}

export type ResetForFilterResult =
  | { ok: true; episodeCount: number }
  | { ok: false; aborted: boolean }

function buildInitialCoreState(
  episodes: PublicGroupedEpisode[],
  pagination: Pagination | undefined,
  episodeCount: number,
): CoreState {
  const id = 'p0'
  const resolvedPagination: Pagination = pagination ?? { has_more: false, next_cursor: null, row_limit: 24 }
  return {
    orderedPageIds: [id],
    domWindowPageIds: [id],
    pageCache: new Map([[id, { id, cursorUsedToFetch: null, episodes, pagination: resolvedPagination }]]),
    pageMeta: new Map([[id, { cursorUsedToFetch: null }]]),
    spacers: new Map(),
    pendingRestoreIds: new Set(),
    episodeCount,
  }
}

/** Evicts the oldest pageCache entry not currently mounted in the DOM window, once the cache
 * exceeds CACHE_MAX_PAGES. Never evicts a domWindowPageIds member -- those are actively
 * rendered and must always resolve. Map insertion order makes "oldest" well-defined. */
function evictCacheIfNeeded(pageCache: Map<string, WindowedPage>, domWindowPageIds: string[]): void {
  if (pageCache.size <= CACHE_MAX_PAGES) return
  for (const id of pageCache.keys()) {
    if (domWindowPageIds.includes(id)) continue
    pageCache.delete(id)
    return
  }
}

/**
 * Bounded, bidirectional infinite-scroll windowing engine for FansubVersionBrowser (D-27..D-39).
 *
 * Design choice (documented per 164-05-PLAN.md's interface note): this hook owns the single
 * `requestRef` AbortController -- forward loads, backward loads and filter resets all share it,
 * so at most one network request is ever in flight and a later call always wins (matching the
 * exact single-flight discipline already proven in FansubVersionBrowser's pre-existing
 * switchTo/loadMore). FansubVersionBrowser no longer needs its own AbortController for episode
 * data; `resetForFilter` fully owns "start fresh under a new filter" (switchTo only manages its
 * own local switchState.loading/error dimming UI around the returned Promise).
 */
export function useWindowedEpisodePages({
  animeID, initialEpisodes, initialPagination, activeFansubSlug, initialEpisodeCount = 0,
}: UseWindowedEpisodePagesParams) {
  const [core, setCore] = useState<CoreState>(
    () => buildInitialCoreState(initialEpisodes, initialPagination, initialEpisodeCount),
  )
  const [forwardLoading, setForwardLoading] = useState(false)
  const [backwardLoading, setBackwardLoading] = useState(false)
  const [forwardError, setForwardError] = useState<string | null>(null)
  const [backwardError, setBackwardError] = useState<string | null>(null)
  const [scrollAnchorAdjustment, setScrollAnchorAdjustment] = useState<AnchorAdjustment | null>(null)

  const requestRef = useRef<AbortController | null>(null)
  const activeFansubSlugRef = useRef(activeFansubSlug)
  const seqRef = useRef(1)
  const lastKnownHeightsRef = useRef<Map<string, number>>(new Map())
  const coreRef = useRef(core)
  coreRef.current = core
  const anchorSeqRef = useRef(0)

  useEffect(() => {
    return () => { requestRef.current?.abort(); requestRef.current = null }
  }, [])

  const loadNext = useCallback(async () => {
    // Single-flight guard (D-46#12): a second bottom-sentinel intersection while a request is
    // already pending issues no additional call.
    if (requestRef.current) return
    const current = coreRef.current
    const tailId = current.orderedPageIds[current.orderedPageIds.length - 1]
    const pagination = tailId ? current.pageCache.get(tailId)?.pagination : undefined
    if (!pagination?.has_more || !pagination.next_cursor) return
    const controller = new AbortController()
    requestRef.current = controller
    setForwardLoading(true)
    setForwardError(null)
    try {
      const response = await getGroupedEpisodes(animeID, {
        projection: 'public',
        limit: 24,
        ...(activeFansubSlugRef.current ? { fansub: activeFansubSlugRef.current } : {}),
        cursor: pagination.next_cursor,
        signal: controller.signal,
      })
      if (controller.signal.aborted || requestRef.current !== controller) return
      const id = `p${seqRef.current++}`
      setCore((prev) => {
        const pageCache = new Map(prev.pageCache)
        pageCache.set(id, {
          id, cursorUsedToFetch: pagination.next_cursor, episodes: response.data.episodes, pagination: response.data.pagination,
        })
        const pageMeta = new Map(prev.pageMeta)
        pageMeta.set(id, { cursorUsedToFetch: pagination.next_cursor })
        const orderedPageIds = [...prev.orderedPageIds, id]
        let domWindowPageIds = [...prev.domWindowPageIds, id]
        const spacers = new Map(prev.spacers)
        if (domWindowPageIds.length > DOM_WINDOW_SIZE) {
          const evictedId = domWindowPageIds[0]
          domWindowPageIds = domWindowPageIds.slice(1)
          spacers.set(evictedId, lastKnownHeightsRef.current.get(evictedId) ?? 0)
        }
        evictCacheIfNeeded(pageCache, domWindowPageIds)
        return {
          ...prev, orderedPageIds, domWindowPageIds, pageCache, pageMeta, spacers, episodeCount: response.data.episode_count,
        }
      })
      requestRef.current = null
      setForwardLoading(false)
    } catch {
      if (controller.signal.aborted || requestRef.current !== controller) return
      requestRef.current = null
      setForwardLoading(false)
      setForwardError('Weitere Episoden konnten nicht geladen werden.')
    }
  }, [animeID])

  const restoreIntoWindow = useCallback((targetId: string, page: WindowedPage) => {
    setCore((prev) => {
      const pageCache = new Map(prev.pageCache)
      pageCache.set(targetId, page)
      let domWindowPageIds = [targetId, ...prev.domWindowPageIds]
      const spacers = new Map(prev.spacers)
      if (domWindowPageIds.length > DOM_WINDOW_SIZE) {
        // Top was just touched -- evict from the bottom (farthest from the touched end).
        const evictedId = domWindowPageIds[domWindowPageIds.length - 1]
        domWindowPageIds = domWindowPageIds.slice(0, DOM_WINDOW_SIZE)
        spacers.set(evictedId, lastKnownHeightsRef.current.get(evictedId) ?? 0)
      }
      const pendingRestoreIds = new Set(prev.pendingRestoreIds)
      pendingRestoreIds.add(targetId)
      evictCacheIfNeeded(pageCache, domWindowPageIds)
      return { ...prev, domWindowPageIds, pageCache, spacers, pendingRestoreIds }
    })
  }, [])

  const loadPrevious = useCallback(async () => {
    if (requestRef.current) return
    const current = coreRef.current
    const firstId = current.domWindowPageIds[0]
    const firstIndex = firstId ? current.orderedPageIds.indexOf(firstId) : -1
    if (firstIndex <= 0) return // window already includes the very first page -- nothing earlier exists.
    const targetId = current.orderedPageIds[firstIndex - 1]
    const cached = current.pageCache.get(targetId)
    if (cached) {
      restoreIntoWindow(targetId, cached)
      return
    }
    // Cache miss: re-issue the exact request that originally produced this page (never a
    // client-invented cursor -- T-164-09).
    const meta = current.pageMeta.get(targetId)
    const controller = new AbortController()
    requestRef.current = controller
    setBackwardLoading(true)
    setBackwardError(null)
    try {
      const response = await getGroupedEpisodes(animeID, {
        projection: 'public',
        limit: 24,
        ...(activeFansubSlugRef.current ? { fansub: activeFansubSlugRef.current } : {}),
        ...(meta?.cursorUsedToFetch ? { cursor: meta.cursorUsedToFetch } : {}),
        signal: controller.signal,
      })
      if (controller.signal.aborted || requestRef.current !== controller) return
      restoreIntoWindow(targetId, {
        id: targetId, cursorUsedToFetch: meta?.cursorUsedToFetch ?? null, episodes: response.data.episodes, pagination: response.data.pagination,
      })
      requestRef.current = null
      setBackwardLoading(false)
    } catch {
      if (controller.signal.aborted || requestRef.current !== controller) return
      requestRef.current = null
      setBackwardLoading(false)
      setBackwardError('Frühere Episoden konnten nicht geladen werden.')
    }
  }, [animeID, restoreIntoWindow])

  const resetForFilter = useCallback(async (slug: string | null): Promise<ResetForFilterResult> => {
    // D-40: a filter switch always aborts any in-flight page load, forward or backward.
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    activeFansubSlugRef.current = slug
    setForwardError(null)
    setBackwardError(null)
    try {
      const response = await getGroupedEpisodes(animeID, {
        projection: 'public',
        limit: 24,
        ...(slug ? { fansub: slug } : {}),
        signal: controller.signal,
      })
      if (controller.signal.aborted || requestRef.current !== controller) return { ok: false, aborted: true }
      seqRef.current = 1
      lastKnownHeightsRef.current = new Map()
      setCore(buildInitialCoreState(response.data.episodes, response.data.pagination, response.data.episode_count))
      requestRef.current = null
      return { ok: true, episodeCount: response.data.episode_count }
    } catch {
      if (controller.signal.aborted || requestRef.current !== controller) return { ok: false, aborted: true }
      requestRef.current = null
      return { ok: false, aborted: false }
    }
  }, [animeID])

  const reportPageHeight = useCallback((pageId: string, heightPx: number) => {
    const current = coreRef.current
    if (current.pendingRestoreIds.has(pageId)) {
      const previousHeight = current.spacers.get(pageId) ?? heightPx
      anchorSeqRef.current += 1
      setScrollAnchorAdjustment({ px: heightPx - previousHeight, seq: anchorSeqRef.current })
      setCore((prev) => {
        const spacers = new Map(prev.spacers)
        spacers.delete(pageId)
        const pendingRestoreIds = new Set(prev.pendingRestoreIds)
        pendingRestoreIds.delete(pageId)
        return { ...prev, spacers, pendingRestoreIds }
      })
      return
    }
    lastKnownHeightsRef.current.set(pageId, heightPx)
  }, [])

  // Bidirectional sentinels: one persistent IntersectionObserver per direction, retargeted via
  // ref-callback (rootMargin mirrors OlderReleasesList.tsx's bottom-sentinel precedent).
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)
  const bottomElRef = useRef<Element | null>(null)
  const loadNextRef = useRef(loadNext)
  loadNextRef.current = loadNext
  const bottomSentinelRef = useCallback((el: HTMLElement | null) => {
    if (bottomElRef.current && bottomObserverRef.current) bottomObserverRef.current.unobserve(bottomElRef.current)
    bottomElRef.current = el
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (!bottomObserverRef.current) {
      bottomObserverRef.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNextRef.current()
      }, { rootMargin: '200px' })
    }
    bottomObserverRef.current.observe(el)
  }, [])

  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const topElRef = useRef<Element | null>(null)
  const loadPreviousRef = useRef(loadPrevious)
  loadPreviousRef.current = loadPrevious
  const topSentinelRef = useCallback((el: HTMLElement | null) => {
    if (topElRef.current && topObserverRef.current) topObserverRef.current.unobserve(topElRef.current)
    topElRef.current = el
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (!topObserverRef.current) {
      topObserverRef.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadPreviousRef.current()
      }, { rootMargin: '200px' })
    }
    topObserverRef.current.observe(el)
  }, [])

  useEffect(() => {
    return () => {
      bottomObserverRef.current?.disconnect()
      topObserverRef.current?.disconnect()
    }
  }, [])

  const pages = useMemo(
    () => core.domWindowPageIds
      .map((id) => core.pageCache.get(id))
      .filter((page): page is WindowedPage => Boolean(page)),
    [core.domWindowPageIds, core.pageCache],
  )

  // D-38: only ever true once genuinely more than one page has been loaded this filter-session.
  const showEndMarker = useMemo(() => {
    const tailId = core.orderedPageIds[core.orderedPageIds.length - 1]
    const tailPagination = tailId ? core.pageCache.get(tailId)?.pagination : undefined
    return core.orderedPageIds.length > 1 && tailPagination?.has_more === false
  }, [core.orderedPageIds, core.pageCache])

  return {
    pages,
    domWindowPageIds: core.domWindowPageIds,
    spacers: core.spacers,
    episodeCount: core.episodeCount,
    forwardLoading,
    backwardLoading,
    forwardError,
    backwardError,
    showEndMarker,
    scrollAnchorAdjustment,
    retryNext: loadNext,
    retryPrevious: loadPrevious,
    resetForFilter,
    reportPageHeight,
    bottomSentinelRef,
    topSentinelRef,
  }
}
