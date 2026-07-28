// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getSearchMock = vi.hoisted(() => vi.fn())
const getSearchSuggestionsMock = vi.hoisted(() => vi.fn())
const routerReplaceMock = vi.hoisted(() => vi.fn())
const searchParamsRef = vi.hoisted(() => ({ current: new URLSearchParams('') }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  usePathname: () => '/suche',
  useSearchParams: () => searchParamsRef.current,
}))

vi.mock('@/lib/api', () => ({
  getSearch: (...args: unknown[]) => getSearchMock(...args),
  getSearchSuggestions: (...args: unknown[]) => getSearchSuggestionsMock(...args),
}))

import { SEARCH_DEBOUNCE_MS, useDebouncedSearch } from './useDebouncedSearch'
import type { SearchResult } from '@/types/search'

function emptyResult(): SearchResult {
  return { anime: { items: [], total: 0 }, fansub: { items: [], total: 0 } }
}

beforeEach(() => {
  vi.useFakeTimers()
  searchParamsRef.current = new URLSearchParams('')
  getSearchMock.mockReset()
  getSearchSuggestionsMock.mockReset()
  routerReplaceMock.mockReset()
  getSearchMock.mockResolvedValue({
    data: emptyResult(),
    meta: { total: 0, page: 1, per_page: 24, total_pages: 0 },
  })
  getSearchSuggestionsMock.mockResolvedValue({ data: emptyResult() })
})

afterEach(() => {
  cleanup()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('useDebouncedSearch', () => {
  it('fasst schnelle Tastendrücke zu genau einem Request nach 250 ms zusammen (Debounce)', async () => {
    const { result } = renderHook(() => useDebouncedSearch())

    await act(async () => {
      result.current.setQuery('naru')
      result.current.setQuery('narut')
      result.current.setQuery('naruto')
    })

    // Debounce-Fenster noch nicht abgelaufen -> kein Request.
    expect(getSearchMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
    })

    expect(getSearchMock).toHaveBeenCalledTimes(1)
    expect(getSearchMock.mock.calls[0][0].q).toBe('naruto')
    // Vorschläge werden ab >= 2 Zeichen ebenfalls einmal geladen.
    expect(getSearchSuggestionsMock).toHaveBeenCalledTimes(1)
    expect(getSearchSuggestionsMock.mock.calls[0][0]).toBe('naruto')
  })

  it('bricht den vorherigen laufenden Request via AbortController ab', async () => {
    const signals: AbortSignal[] = []
    getSearchMock.mockImplementation((_params: unknown, signal: AbortSignal) => {
      signals.push(signal)
      return new Promise(() => {}) // bleibt bewusst offen (in-flight)
    })

    const { result } = renderHook(() => useDebouncedSearch())

    await act(async () => {
      result.current.setQuery('naruto')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
    })

    await act(async () => {
      result.current.setQuery('bleach')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
    })

    expect(getSearchMock).toHaveBeenCalledTimes(2)
    expect(signals).toHaveLength(2)
    // Der erste (veraltete) Request wurde abgebrochen, der zweite läuft.
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  it('spiegelt q/type/page in die URL (useSearchParams-Sync)', async () => {
    const { result } = renderHook(() => useDebouncedSearch())

    await act(async () => {
      result.current.setQuery('naruto')
      result.current.setType('anime')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
    })

    expect(routerReplaceMock).toHaveBeenCalled()
    const lastCall = routerReplaceMock.mock.calls.at(-1)?.[0] as string
    expect(lastCall).toContain('q=naruto')
    expect(lastCall).toContain('type=anime')
  })

  it('stellt den Zustand aus vorhandenen URL-Parametern wieder her (Reload)', () => {
    searchParamsRef.current = new URLSearchParams('q=naruto&type=anime&page=3')
    const { result } = renderHook(() => useDebouncedSearch())

    expect(result.current.q).toBe('naruto')
    expect(result.current.type).toBe('anime')
    expect(result.current.page).toBe(3)
  })

  it('löst bei q-Länge < 2 keinen Such- oder Vorschlags-Request aus', async () => {
    const { result } = renderHook(() => useDebouncedSearch())

    await act(async () => {
      result.current.setQuery('n')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
    })

    expect(getSearchMock).not.toHaveBeenCalled()
    expect(getSearchSuggestionsMock).not.toHaveBeenCalled()
  })
})
