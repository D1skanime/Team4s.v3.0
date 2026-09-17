// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getGroupedEpisodes } from '@/lib/api'

vi.mock('@/lib/api', () => ({ getGroupedEpisodes: vi.fn() }))

import type { PublicGroupedEpisode, PublicGroupedEpisodesOptions, PublicGroupedEpisodesResponse } from '@/types/episodeVersion'
import { useWindowedEpisodePages } from './useWindowedEpisodePages'

const groupedMock = vi.mocked(getGroupedEpisodes as (animeID: number, options: PublicGroupedEpisodesOptions) => Promise<PublicGroupedEpisodesResponse>)

/** Manual IntersectionObserver stub (mirrors useNearViewportActivation.test.ts's convention):
 * every constructed instance is tracked so a test can find "the observer that observed this
 * sentinel element" and fire its callback manually. */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  options?: IntersectionObserverInit
  observed = new Set<Element>()
  root = null
  rootMargin = ''
  thresholds: number[] = []

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    MockIntersectionObserver.instances.push(this)
  }

  observe = (el: Element) => { this.observed.add(el) }
  unobserve = (el: Element) => { this.observed.delete(el) }
  disconnect = () => { this.observed.clear() }
  takeRecords = () => []

  static fire(el: Element, isIntersecting = true) {
    const observer = MockIntersectionObserver.instances.find((instance) => instance.observed.has(el))
    observer?.callback([{ isIntersecting, target: el } as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
  }
}

function ep(id: number, overrides: Partial<PublicGroupedEpisode> = {}): PublicGroupedEpisode {
  return {
    episode_id: id, episode_number: id, episode_title: `Folge ${id}`, version_count: 0, versions: [],
    filler_type: 'unknown', episode_type: 'episode',
    ...overrides,
  }
}

function page(episodes: PublicGroupedEpisode[], hasMore: boolean, nextCursor: string | null): PublicGroupedEpisodesResponse {
  return {
    data: {
      anime_id: 4, episodes, episode_count: 999,
      pagination: { has_more: hasMore, next_cursor: nextCursor, row_limit: 24 },
    },
  }
}

beforeEach(() => {
  groupedMock.mockReset()
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('useWindowedEpisodePages', () => {
  it('starts with exactly one page and nothing evicted', () => {
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(1)], initialPagination: { has_more: false, next_cursor: null, row_limit: 24 }, activeFansubSlug: null,
    }))
    expect(result.current.pages).toHaveLength(1)
    expect(result.current.domWindowPageIds).toHaveLength(1)
    expect(result.current.spacers.size).toBe(0)
    expect(result.current.showEndMarker).toBe(false)
  })

  it('bottom sentinel triggers exactly one loadNext call, single-flight guards a second intersection', async () => {
    const pending = deferred<PublicGroupedEpisodesResponse>()
    groupedMock.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(1)], initialPagination: { has_more: true, next_cursor: 'c1', row_limit: 24 }, activeFansubSlug: null,
    }))
    const sentinel = document.createElement('div')
    act(() => { result.current.bottomSentinelRef(sentinel) })
    act(() => { MockIntersectionObserver.fire(sentinel) })
    act(() => { MockIntersectionObserver.fire(sentinel) })
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(1)
    expect(getGroupedEpisodes).toHaveBeenCalledWith(4, expect.objectContaining({ cursor: 'c1', limit: 24, projection: 'public' }))
    await act(async () => { pending.resolve(page([ep(2)], false, null)) })
    expect(result.current.pages).toHaveLength(2)
  })

  it('evicts the oldest page into a spacer once a 4th page loads (DOM_WINDOW_SIZE=3)', async () => {
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(0)], initialPagination: { has_more: true, next_cursor: 'c1', row_limit: 24 }, activeFansubSlug: null,
    }))
    act(() => { result.current.reportPageHeight('p0', 240) })
    groupedMock.mockResolvedValueOnce(page([ep(1)], true, 'c2'))
    await act(async () => { await result.current.retryNext() })
    groupedMock.mockResolvedValueOnce(page([ep(2)], true, 'c3'))
    await act(async () => { await result.current.retryNext() })
    expect(result.current.domWindowPageIds).toEqual(['p0', 'p1', 'p2'])
    groupedMock.mockResolvedValueOnce(page([ep(3)], false, null))
    await act(async () => { await result.current.retryNext() })
    expect(result.current.domWindowPageIds).toEqual(['p1', 'p2', 'p3'])
    expect(result.current.spacers.get('p0')).toBe(240)
    expect(result.current.pages.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('restores an evicted page from cache with zero network requests and reports a scroll-anchor delta', async () => {
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(0)], initialPagination: { has_more: true, next_cursor: 'c1', row_limit: 24 }, activeFansubSlug: null,
    }))
    act(() => { result.current.reportPageHeight('p0', 240) })
    groupedMock.mockResolvedValueOnce(page([ep(1)], true, 'c2'))
    await act(async () => { await result.current.retryNext() })
    groupedMock.mockResolvedValueOnce(page([ep(2)], true, 'c3'))
    await act(async () => { await result.current.retryNext() })
    groupedMock.mockResolvedValueOnce(page([ep(3)], false, null))
    await act(async () => { await result.current.retryNext() })
    expect(result.current.spacers.has('p0')).toBe(true)
    const callsBeforeRestore = groupedMock.mock.calls.length

    const topSentinel = document.createElement('div')
    act(() => { result.current.topSentinelRef(topSentinel) })
    act(() => { MockIntersectionObserver.fire(topSentinel) })
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeRestore) // zero additional network calls
    expect(result.current.domWindowPageIds).toEqual(['p0', 'p1', 'p2'])

    act(() => { result.current.reportPageHeight('p0', 260) })
    expect(result.current.scrollAnchorAdjustment?.px).toBe(20)
    expect(result.current.spacers.has('p0')).toBe(false)
  })

  it('re-fetches a page using its originally-stored cursor once it has aged out of the cache too', async () => {
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(0)], initialPagination: { has_more: true, next_cursor: 'c1', row_limit: 24 }, activeFansubSlug: null,
    }))
    // Load pages p1..p6 (7 pages total incl. p0) -- forces p0 out of both the DOM window and
    // the 6-page cache bound.
    for (let index = 1; index <= 6; index++) {
      const isLast = index === 6
      groupedMock.mockResolvedValueOnce(page([ep(index)], !isLast, isLast ? null : `c${index + 1}`))
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await result.current.retryNext() })
    }
    expect(result.current.domWindowPageIds).toEqual(['p4', 'p5', 'p6'])

    // Walk back three restorations (p3, p2, p1 are still cache-hits) to reach the window edge
    // where the next restoration target (p0) has already been evicted from the cache.
    for (let step = 0; step < 3; step++) {
      const topSentinel = document.createElement('div')
      act(() => { result.current.topSentinelRef(topSentinel) })
      act(() => { MockIntersectionObserver.fire(topSentinel) })
      act(() => { result.current.reportPageHeight(result.current.domWindowPageIds[0], 200) })
    }
    expect(result.current.domWindowPageIds).toEqual(['p1', 'p2', 'p3'])
    const callsBeforeRefetch = groupedMock.mock.calls.length

    groupedMock.mockResolvedValueOnce(page([ep(0)], true, 'c1'))
    const topSentinel = document.createElement('div')
    act(() => { result.current.topSentinelRef(topSentinel) })
    await act(async () => { MockIntersectionObserver.fire(topSentinel) })
    expect(getGroupedEpisodes).toHaveBeenCalledTimes(callsBeforeRefetch + 1)
    // p0's cursorUsedToFetch is null (it is the very first page) -- the re-fetch must not
    // invent a cursor.
    expect(groupedMock.mock.calls[callsBeforeRefetch][1]).not.toHaveProperty('cursor')
    expect(result.current.domWindowPageIds).toEqual(['p0', 'p1', 'p2'])
  })

  it('keeps forward and backward errors independent and exposes retryNext/retryPrevious', async () => {
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(0)], initialPagination: { has_more: true, next_cursor: 'c1', row_limit: 24 }, activeFansubSlug: null,
    }))
    groupedMock.mockRejectedValueOnce(new Error('network'))
    await act(async () => { await result.current.retryNext() })
    expect(result.current.forwardError).toBe('Weitere Episoden konnten nicht geladen werden.')
    expect(result.current.backwardError).toBeNull()

    // No earlier page exists yet -- retryPrevious is a no-op and must not disturb forwardError.
    await act(async () => { await result.current.retryPrevious() })
    expect(result.current.forwardError).toBe('Weitere Episoden konnten nicht geladen werden.')

    groupedMock.mockResolvedValueOnce(page([ep(1)], false, null))
    await act(async () => { await result.current.retryNext() })
    expect(result.current.forwardError).toBeNull()
    expect(result.current.pages).toHaveLength(2)
  })

  it('gates the end marker on more than one page having loaded, not merely has_more=false', async () => {
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(0)], initialPagination: { has_more: false, next_cursor: null, row_limit: 24 }, activeFansubSlug: null,
    }))
    expect(result.current.showEndMarker).toBe(false) // single page, e.g. real Naruto today

    const { result: multi } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(0)], initialPagination: { has_more: true, next_cursor: 'c1', row_limit: 24 }, activeFansubSlug: null,
    }))
    groupedMock.mockResolvedValueOnce(page([ep(1)], false, null))
    await act(async () => { await multi.current.retryNext() })
    expect(multi.current.showEndMarker).toBe(true)
  })

  it('resetForFilter clears pages/spacers/errors and immediately loads page 1 of the new filter', async () => {
    const { result } = renderHook(() => useWindowedEpisodePages({
      animeID: 4, initialEpisodes: [ep(0)], initialPagination: { has_more: true, next_cursor: 'c1', row_limit: 24 }, activeFansubSlug: null,
    }))
    groupedMock.mockRejectedValueOnce(new Error('network'))
    await act(async () => { await result.current.retryNext() })
    expect(result.current.forwardError).not.toBeNull()

    groupedMock.mockResolvedValueOnce(page([ep(100)], false, null))
    let outcome: Awaited<ReturnType<typeof result.current.resetForFilter>> | undefined
    await act(async () => { outcome = await result.current.resetForFilter('other-group') })
    expect(outcome).toEqual({ ok: true, episodeCount: 999 })
    expect(result.current.forwardError).toBeNull()
    expect(result.current.backwardError).toBeNull()
    expect(result.current.spacers.size).toBe(0)
    expect(result.current.domWindowPageIds).toEqual(['p0'])
    expect(result.current.pages[0].episodes[0].episode_id).toBe(100)
    expect(groupedMock).toHaveBeenLastCalledWith(4, expect.objectContaining({ fansub: 'other-group' }))
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
