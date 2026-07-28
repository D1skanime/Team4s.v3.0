// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getSearchMock = vi.hoisted(() => vi.fn())
const getSearchSuggestionsMock = vi.hoisted(() => vi.fn())
const routerReplaceMock = vi.hoisted(() => vi.fn())
const routerPushMock = vi.hoisted(() => vi.fn())
const searchParamsRef = vi.hoisted(() => ({ current: new URLSearchParams('q=naruto') }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: routerPushMock }),
  usePathname: () => '/suche',
  useSearchParams: () => searchParamsRef.current,
}))

vi.mock('@/lib/api', () => ({
  getSearch: (...args: unknown[]) => getSearchMock(...args),
  getSearchSuggestions: (...args: unknown[]) => getSearchSuggestionsMock(...args),
}))

import { SearchResults } from './SearchResults'
import { SEARCH_DEBOUNCE_MS } from './useDebouncedSearch'
import type { SearchResult } from '@/types/search'

function populatedResult(): SearchResult {
  return {
    anime: {
      items: [
        { type: 'anime', id: 1, slug: 'naruto', title: 'Naruto', year: 2002, format: 'TV' },
        { type: 'anime', id: 2, slug: 'bleach', title: 'Bleach', year: 2004, format: 'TV' },
      ],
      total: 2,
    },
    fansub: {
      items: [{ type: 'fansub', id: 9, slug: 'team-4s', title: 'Team4s' }],
      total: 1,
    },
  }
}

function emptyResult(): SearchResult {
  return { anime: { items: [], total: 0 }, fansub: { items: [], total: 0 } }
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  searchParamsRef.current = new URLSearchParams('q=naruto')
  getSearchMock.mockReset()
  getSearchSuggestionsMock.mockReset()
  routerReplaceMock.mockReset()
  routerPushMock.mockReset()
  getSearchMock.mockResolvedValue({
    data: populatedResult(),
    meta: { total: 3, page: 1, per_page: 24, total_pages: 1 },
  })
  getSearchSuggestionsMock.mockResolvedValue({ data: emptyResult() })
})

afterEach(() => {
  cleanup()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('SearchResults', () => {
  it('rendert die drei Ergebnis-Tabs mit Trefferzahl-Badges (Alle/Anime/Fansubgruppen)', async () => {
    render(<SearchResults />)
    await settle()

    expect(screen.getByRole('tab', { name: /Alle/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Anime/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Fansubgruppen/ })).toBeTruthy()

    // Trefferzahl-Badges: alle=3 (Summe), anime=2, fansub=1. Die Zählungen tauchen sowohl
    // als Tab-Badge als auch im „Alle"-Panel als Sektions-Header-Badge auf (>= 1 Vorkommen).
    expect(screen.getByText('3 Treffer')).toBeTruthy()
    expect(screen.getAllByText('2 Treffer').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1 Treffer').length).toBeGreaterThanOrEqual(1)
  })

  it('zeigt bei fehlenden Treffern den Empty-State „Keine Treffer für …"', async () => {
    getSearchMock.mockResolvedValue({
      data: emptyResult(),
      meta: { total: 0, page: 1, per_page: 24, total_pages: 0 },
    })

    render(<SearchResults />)
    await settle()

    expect(screen.getByText('Keine Treffer für „naruto"')).toBeTruthy()
  })

  it('zeigt bei einem Fehler den ErrorState (getErrorStateCopy-Default-Titel)', async () => {
    getSearchMock.mockRejectedValue(new Error('boom'))

    render(<SearchResults />)
    await settle()

    expect(screen.getByText('Suche nicht verfügbar')).toBeTruthy()
  })

  it('schreibt bei Tab-Wechsel den type in die URL (key-Remount-Strategie)', async () => {
    render(<SearchResults />)
    await settle()

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /Anime/ }))
    })
    await settle()

    const wroteType = routerReplaceMock.mock.calls.some((call) =>
      String(call[0]).includes('type=anime'),
    )
    expect(wroteType).toBe(true)
  })
})
