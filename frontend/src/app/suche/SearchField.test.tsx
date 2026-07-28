// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getSearchMock = vi.hoisted(() => vi.fn())
const getSearchSuggestionsMock = vi.hoisted(() => vi.fn())
const routerReplaceMock = vi.hoisted(() => vi.fn())
const routerPushMock = vi.hoisted(() => vi.fn())
const searchParamsRef = vi.hoisted(() => ({ current: new URLSearchParams('') }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: routerPushMock }),
  usePathname: () => '/suche',
  useSearchParams: () => searchParamsRef.current,
}))

vi.mock('@/lib/api', () => ({
  getSearch: (...args: unknown[]) => getSearchMock(...args),
  getSearchSuggestions: (...args: unknown[]) => getSearchSuggestionsMock(...args),
}))

import { SearchField } from './SearchField'
import { SEARCH_DEBOUNCE_MS } from './useDebouncedSearch'
import type { SearchResult } from '@/types/search'

function suggestionResult(): SearchResult {
  return {
    anime: { items: [{ type: 'anime', id: 1, slug: 'naruto', title: 'Naruto' }], total: 1 },
    fansub: { items: [{ type: 'fansub', id: 2, slug: 'group-x', title: 'Group X' }], total: 1 },
  }
}

/** Tippt einen Wert ins Suchfeld und lässt das Debounce-Fenster ablaufen. */
async function typeAndSettle(input: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(input, { target: { value } })
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  searchParamsRef.current = new URLSearchParams('')
  getSearchMock.mockReset()
  getSearchSuggestionsMock.mockReset()
  routerReplaceMock.mockReset()
  routerPushMock.mockReset()
  getSearchMock.mockResolvedValue({
    data: suggestionResult(),
    meta: { total: 2, page: 1, per_page: 24, total_pages: 1 },
  })
  getSearchSuggestionsMock.mockResolvedValue({ data: suggestionResult() })
})

afterEach(() => {
  cleanup()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('SearchField', () => {
  it('rendert Placeholder und aria-label exakt gemäß Copywriting Contract', () => {
    render(<SearchField />)

    expect(screen.getByPlaceholderText('Anime oder Fansubgruppe suchen …')).toBeTruthy()
    expect(screen.getByLabelText('Suchbegriff eingeben')).toBeTruthy()
  })

  it('löst bei < 2 Zeichen weder Suche noch Vorschläge aus (Guard)', async () => {
    render(<SearchField />)
    const input = screen.getByLabelText('Suchbegriff eingeben')

    await typeAndSettle(input, 'n')

    expect(getSearchSuggestionsMock).not.toHaveBeenCalled()
    expect(getSearchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('lädt Vorschläge ab 2 Zeichen und markiert per ↓ die erste Option (aria-activedescendant)', async () => {
    render(<SearchField />)
    const input = screen.getByLabelText('Suchbegriff eingeben')

    await typeAndSettle(input, 'naruto')

    expect(getSearchSuggestionsMock).toHaveBeenCalledTimes(1)
    expect(getSearchSuggestionsMock.mock.calls[0][0]).toBe('naruto')
    expect(screen.getByRole('listbox')).toBeTruthy()

    // Vor Navigation ist keine Option markiert.
    expect(input.getAttribute('aria-activedescendant')).toBeNull()

    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })

    const activeId = input.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    const option = document.getElementById(activeId as string)
    expect(option?.getAttribute('role')).toBe('option')
    expect(option?.getAttribute('aria-selected')).toBe('true')
  })

  it('navigiert mit ↓ durch die Vorschläge weiter (zweite Option)', async () => {
    render(<SearchField />)
    const input = screen.getByLabelText('Suchbegriff eingeben')

    await typeAndSettle(input, 'naruto')

    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    const firstId = input.getAttribute('aria-activedescendant')

    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    const secondId = input.getAttribute('aria-activedescendant')

    expect(secondId).toBeTruthy()
    expect(secondId).not.toBe(firstId)
  })

  it('schließt das Dropdown mit Esc', async () => {
    render(<SearchField />)
    const input = screen.getByLabelText('Suchbegriff eingeben')

    await typeAndSettle(input, 'naruto')
    expect(screen.getByRole('listbox')).toBeTruthy()

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })

    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
