import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAnimeList } from '@/lib/api'
import type { AnimeListItem, PaginatedAnimeResponse } from '@/types/anime'
import {
  buildAnimeDetailHref,
  buildAnimeGridQuery,
  buildAnimeListHrefFromGridQuery,
  parseAnimeListParamsFromGridQuery,
  resolveAnimeNeighbors,
} from './animeGridContext'

vi.mock('@/lib/api', () => ({ getAnimeList: vi.fn() }))

describe('grid page round-trip', () => {
  it.each([1, 2, 3])('retains target page %s and all filters through detail and back to list', (page) => {
    const params = { page, per_page: 24, q: 'Zwei Wörter', letter: 'Z', content_type: 'anime' as const, status: 'done' as const }
    const query = buildAnimeGridQuery(params)
    const detail = new URL(buildAnimeDetailHref(55, query), 'http://localhost')
    expect(detail.searchParams.get('from')).toBe('anime-grid')
    expect(parseAnimeListParamsFromGridQuery(detail.searchParams.get('grid_query')!)).toEqual(params)
    expect(buildAnimeListHrefFromGridQuery(detail.searchParams.get('grid_query')!)).toBe(`/anime?${query}`)
  })
})

describe('resolveAnimeNeighbors', () => {
  const item = (id: number): AnimeListItem => ({ id, title: `Anime ${id}`, type: 'tv', status: 'done' })
  /** Baut eine Seitenantwort mit 3 Elementen je Seite und insgesamt 3 Seiten (9 Elemente). */
  function page(pageNumber: number, ids = [pageNumber * 3 - 2, pageNumber * 3 - 1, pageNumber * 3]): PaginatedAnimeResponse {
    return { data: ids.map(item), meta: { page: pageNumber, per_page: 3, total: 9, total_pages: 3 } }
  }

  beforeEach(() => {
    vi.mocked(getAnimeList).mockReset().mockImplementation(async (params) => page(params.page ?? 1))
  })

  it('findet prev/next in der Mitte einer Seite ohne zusätzlichen Fetch', async () => {
    const result = await resolveAnimeNeighbors({ per_page: 3, page: 2 }, 5)
    expect(result.prev).toEqual({ anime: item(4), page: 2 })
    expect(result.next).toEqual({ anime: item(6), page: 2 })
    expect(getAnimeList).toHaveBeenCalledTimes(1)
  })

  it('lädt beim ersten Element einer Seite ≥2 die vorherige Seite und nimmt deren letztes Element', async () => {
    const result = await resolveAnimeNeighbors({ per_page: 3, page: 2 }, 4)
    expect(result.prev).toEqual({ anime: item(3), page: 1 })
    expect(getAnimeList).toHaveBeenCalledTimes(2)
    expect(getAnimeList).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 1 }), expect.anything())
  })

  it('lädt beim letzten Element einer Nicht-Endseite die nächste Seite und nimmt deren erstes Element', async () => {
    const result = await resolveAnimeNeighbors({ per_page: 3, page: 2 }, 6)
    expect(result.next).toEqual({ anime: item(7), page: 3 })
    expect(getAnimeList).toHaveBeenCalledTimes(2)
    expect(getAnimeList).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 3 }), expect.anything())
  })

  it('bleibt beim ersten Element der ersten Seite ohne prev und ohne Extra-Fetch', async () => {
    const result = await resolveAnimeNeighbors({ per_page: 3, page: 1 }, 1)
    expect(result.prev).toBeNull()
    expect(getAnimeList).toHaveBeenCalledTimes(1)
  })

  it('bleibt beim letzten Element der letzten Seite ohne next und ohne Extra-Fetch', async () => {
    const result = await resolveAnimeNeighbors({ per_page: 3, page: 3 }, 9)
    expect(result.next).toBeNull()
    expect(getAnimeList).toHaveBeenCalledTimes(1)
  })

  it('liefert beide Richtungen als null und ohne Extra-Fetch, wenn die ID auf der Seite nicht gefunden wird', async () => {
    const result = await resolveAnimeNeighbors({ per_page: 3, page: 2 }, 999)
    expect(result).toEqual({ prev: null, next: null })
    expect(getAnimeList).toHaveBeenCalledTimes(1)
  })

  it('reicht ein übergebenes AbortSignal an jeden getAnimeList-Aufruf durch', async () => {
    const controller = new AbortController()
    await resolveAnimeNeighbors({ per_page: 3, page: 2 }, 4, { signal: controller.signal })
    for (const [, options] of vi.mocked(getAnimeList).mock.calls) {
      expect(options?.signal).toBe(controller.signal)
    }
  })
})
