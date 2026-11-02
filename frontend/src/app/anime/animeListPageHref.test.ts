import { describe, expect, it } from 'vitest'

import { buildAnimeListPageHref } from './animeListPageHref'

describe('buildAnimeListPageHref', () => {
  it('setzt nur die Seitenzahl, wenn keine Filter aktiv sind', () => {
    expect(buildAnimeListPageHref(2, { letter: '', perPage: 0 })).toBe('/anime?page=2')
  })

  it('übernimmt A-Z-Filter, Seitengröße, Inhaltstyp und Status in die Ziel-URL', () => {
    const href = buildAnimeListPageHref(3, { letter: 'A', perPage: 48, contentType: 'anime', status: 'ongoing' })
    const params = new URL(href, 'http://localhost').searchParams

    expect(params.get('page')).toBe('3')
    expect(params.get('letter')).toBe('A')
    expect(params.get('per_page')).toBe('48')
    expect(params.get('content_type')).toBe('anime')
    expect(params.get('status')).toBe('ongoing')
  })

  it('belässt den literalen {page}-Platzhalter unkodiert, wenn er für ein hrefPattern gebaut wird', () => {
    const href = buildAnimeListPageHref('{page}', { letter: 'A', perPage: 48 })
    expect(href).toBe('/anime?page={page}&letter=A&per_page=48')
  })
})
