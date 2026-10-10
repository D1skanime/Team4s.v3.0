import { describe, expect, it } from 'vitest'

import { GenreToken, TagToken } from '@/types/admin'

import {
  filterAutocompleteSuggestions,
  limitAutocompleteSuggestions,
  shouldLoadCatalog,
} from './useGenreTagAutocomplete'

// D-10: these tests call the hook's extracted pure filter/limit/guard
// functions directly — no render/mount of the hook itself — covering every
// behavior the hook composes them into.

const genreTokens: GenreToken[] = [
  { name: 'Action', count: 10 },
  { name: 'Drama', count: 5 },
  { name: 'Übernatürlich', count: 3 },
]

const tagTokens: TagToken[] = [
  { name: 'Mecha', count: 7 },
  { name: 'Schulalltag', count: 4 },
  { name: 'Übernatürlich', count: 2 },
]

describe('filterAutocompleteSuggestions', () => {
  it('matches an ASCII substring draft against a token case-insensitively', () => {
    const result = filterAutocompleteSuggestions(genreTokens, 'actio', [])
    expect(result.map((t) => t.name)).toEqual(['Action'])
  })

  it('excludes a token whose lowercased name is already selected, regardless of draft text', () => {
    const result = filterAutocompleteSuggestions(genreTokens, '', ['action'])
    expect(result.map((t) => t.name)).toEqual(['Drama', 'Übernatürlich'])
  })

  it('matches an umlaut-stripped ASCII draft against an accented catalog token (D-15)', () => {
    // matchesSearch is accent-strip-only (Option A, established in 178-01's
    // textFilter.ts) — it drops diacritics (ü -> u) but does not expand
    // umlauts into ae/oe/ue digraphs. "ubernaturlich" is therefore the
    // correct ASCII-stripped form of "Übernatürlich", not "ubernatuerlich".
    const result = filterAutocompleteSuggestions(genreTokens, 'ubernaturlich', [])
    expect(result.map((t) => t.name)).toEqual(['Übernatürlich'])
  })

  it('returns every non-excluded token when the draft is empty', () => {
    const result = filterAutocompleteSuggestions(genreTokens, '', [])
    expect(result).toHaveLength(3)
  })

  it('mirrors every genre-side behavior for tag tokens', () => {
    expect(filterAutocompleteSuggestions(tagTokens, 'mech', []).map((t) => t.name)).toEqual(['Mecha'])
    expect(filterAutocompleteSuggestions(tagTokens, '', ['mecha']).map((t) => t.name)).toEqual([
      'Schulalltag',
      'Übernatürlich',
    ])
    expect(filterAutocompleteSuggestions(tagTokens, 'ubernaturlich', []).map((t) => t.name)).toEqual([
      'Übernatürlich',
    ])
  })
})

describe('limitAutocompleteSuggestions', () => {
  const manyTokens: GenreToken[] = Array.from({ length: 50 }, (_, index) => ({
    name: `Genre ${index}`,
    count: index,
  }))

  it('slices to the plain limit when the draft is empty', () => {
    const result = limitAutocompleteSuggestions(manyTokens, '', 10)
    expect(result).toHaveLength(10)
  })

  it('uses Math.max(80, limit) sizing when a draft query is present', () => {
    const result = limitAutocompleteSuggestions(manyTokens, 'genre', 10)
    expect(result).toHaveLength(50)
  })

  it('keeps the suggestions total (full filtered length) independent of the slice limit', () => {
    const filtered = filterAutocompleteSuggestions(manyTokens, '', [])
    const sliced = limitAutocompleteSuggestions(filtered, '', 10)
    expect(filtered).toHaveLength(50)
    expect(sliced).toHaveLength(10)
  })
})

describe('shouldLoadCatalog', () => {
  it('returns false when enabled is explicitly false, regardless of current catalog length', () => {
    expect(shouldLoadCatalog(false, 0)).toBe(false)
  })

  it('returns true when enabled is omitted (defaults on) and the catalog is empty', () => {
    expect(shouldLoadCatalog(undefined, 0)).toBe(true)
  })

  it('returns true when enabled is explicitly true and the catalog is empty', () => {
    expect(shouldLoadCatalog(true, 0)).toBe(true)
  })

  it('returns false once the catalog is already loaded (fetch-once-ever semantics)', () => {
    expect(shouldLoadCatalog(true, 3)).toBe(false)
  })
})
