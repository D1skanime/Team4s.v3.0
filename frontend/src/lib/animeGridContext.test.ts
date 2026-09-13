import { describe, expect, it } from 'vitest'
import { buildAnimeDetailHref, buildAnimeGridQuery, buildAnimeListHrefFromGridQuery, parseAnimeListParamsFromGridQuery } from './animeGridContext'

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
