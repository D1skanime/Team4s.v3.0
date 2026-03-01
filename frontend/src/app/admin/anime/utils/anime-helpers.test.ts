import { describe, expect, it } from 'vitest'

import {
  formatEpisodeStatusLabel,
  normalizeGenreToken,
  normalizeOptionalString,
  parsePositiveInt,
  resolveCoverUrl,
  resolveAnimeStatusClass,
  resolveEpisodeStatusClass,
  splitGenreTokens,
} from './anime-helpers'

describe('parsePositiveInt', () => {
  it('parses valid positive integers', () => {
    expect(parsePositiveInt('1')).toBe(1)
    expect(parsePositiveInt('42')).toBe(42)
    expect(parsePositiveInt('999')).toBe(999)
  })

  it('returns null for zero', () => {
    expect(parsePositiveInt('0')).toBeNull()
  })

  it('returns null for negative numbers', () => {
    expect(parsePositiveInt('-1')).toBeNull()
    expect(parsePositiveInt('-42')).toBeNull()
  })

  it('returns null for non-numeric strings', () => {
    expect(parsePositiveInt('')).toBeNull()
    expect(parsePositiveInt('abc')).toBeNull()
    expect(parsePositiveInt('12abc')).toBe(12)
  })

  it('returns null for floats', () => {
    expect(parsePositiveInt('3.14')).toBe(3)
  })

  it('handles whitespace in input', () => {
    expect(parsePositiveInt(' 5 ')).toBe(5)
  })
})

describe('normalizeOptionalString', () => {
  it('returns trimmed string for non-empty values', () => {
    expect(normalizeOptionalString('hello')).toBe('hello')
    expect(normalizeOptionalString('  hello  ')).toBe('hello')
  })

  it('returns undefined for empty string', () => {
    expect(normalizeOptionalString('')).toBeUndefined()
  })

  it('returns undefined for whitespace-only string', () => {
    expect(normalizeOptionalString('   ')).toBeUndefined()
    expect(normalizeOptionalString('\t\n')).toBeUndefined()
  })
})

describe('normalizeGenreToken', () => {
  it('trims whitespace', () => {
    expect(normalizeGenreToken('  Action  ')).toBe('Action')
  })

  it('collapses multiple spaces to single space', () => {
    expect(normalizeGenreToken('Slice  of   Life')).toBe('Slice of Life')
  })

  it('handles already normalized tokens', () => {
    expect(normalizeGenreToken('Drama')).toBe('Drama')
  })
})

describe('splitGenreTokens', () => {
  it('returns empty array for empty string', () => {
    expect(splitGenreTokens('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(splitGenreTokens('   ')).toEqual([])
  })

  it('returns single token when no comma present', () => {
    expect(splitGenreTokens('Action')).toEqual(['Action'])
    expect(splitGenreTokens('  Action  ')).toEqual(['Action'])
  })

  it('splits comma-separated tokens and normalizes each', () => {
    expect(splitGenreTokens('Action, Drama')).toEqual(['Action', 'Drama'])
    expect(splitGenreTokens('Action,Drama,Comedy')).toEqual(['Action', 'Drama', 'Comedy'])
  })

  it('filters out empty tokens', () => {
    expect(splitGenreTokens('Action,,Drama')).toEqual(['Action', 'Drama'])
    expect(splitGenreTokens(',Action,')).toEqual(['Action'])
  })

  it('normalizes whitespace in each token', () => {
    expect(splitGenreTokens('  Slice  of Life  ,  Drama  ')).toEqual(['Slice of Life', 'Drama'])
  })
})

describe('resolveCoverUrl', () => {
  it('returns placeholder for undefined', () => {
    expect(resolveCoverUrl(undefined)).toBe('/covers/placeholder.jpg')
  })

  it('returns placeholder for empty string', () => {
    expect(resolveCoverUrl('')).toBe('/covers/placeholder.jpg')
  })

  it('returns placeholder for whitespace-only string', () => {
    expect(resolveCoverUrl('   ')).toBe('/covers/placeholder.jpg')
  })

  it('returns http URLs unchanged', () => {
    expect(resolveCoverUrl('http://example.com/cover.jpg')).toBe('http://example.com/cover.jpg')
  })

  it('returns https URLs unchanged', () => {
    expect(resolveCoverUrl('https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg')
  })

  it('returns absolute paths unchanged', () => {
    expect(resolveCoverUrl('/custom/path/cover.jpg')).toBe('/custom/path/cover.jpg')
  })

  it('prefixes relative filenames with /covers/', () => {
    expect(resolveCoverUrl('cover.jpg')).toBe('/covers/cover.jpg')
    expect(resolveCoverUrl('anime-001.png')).toBe('/covers/anime-001.png')
  })

  it('trims whitespace before processing', () => {
    expect(resolveCoverUrl('  cover.jpg  ')).toBe('/covers/cover.jpg')
  })
})

describe('resolveAnimeStatusClass', () => {
  it('returns correct class for ongoing status', () => {
    expect(resolveAnimeStatusClass('ongoing')).toBe('statusOngoing')
  })

  it('returns correct class for done status', () => {
    expect(resolveAnimeStatusClass('done')).toBe('statusDone')
  })

  it('returns correct class for aborted status', () => {
    expect(resolveAnimeStatusClass('aborted')).toBe('statusAborted')
  })

  it('returns correct class for licensed status', () => {
    expect(resolveAnimeStatusClass('licensed')).toBe('statusLicensed')
  })

  it('returns correct class for disabled status', () => {
    expect(resolveAnimeStatusClass('disabled')).toBe('statusDisabled')
  })

  it('returns disabled class as default for unknown status', () => {
    expect(resolveAnimeStatusClass('unknown' as never)).toBe('statusDisabled')
  })
})

describe('resolveEpisodeStatusClass', () => {
  it('returns correct class for public status', () => {
    expect(resolveEpisodeStatusClass('public')).toBe('statusPublic')
  })

  it('returns correct class for private status', () => {
    expect(resolveEpisodeStatusClass('private')).toBe('statusPrivate')
  })

  it('returns correct class for disabled status', () => {
    expect(resolveEpisodeStatusClass('disabled')).toBe('statusDisabled')
  })

  it('returns disabled class as default for unknown status', () => {
    expect(resolveEpisodeStatusClass('unknown' as never)).toBe('statusDisabled')
  })
})

describe('formatEpisodeStatusLabel', () => {
  it('returns German label for public status', () => {
    expect(formatEpisodeStatusLabel('public')).toBe('oeffentlich')
  })

  it('returns German label for private status', () => {
    expect(formatEpisodeStatusLabel('private')).toBe('privat')
  })

  it('returns German label for disabled status', () => {
    expect(formatEpisodeStatusLabel('disabled')).toBe('deaktiviert')
  })

  it('returns deaktiviert as default for unknown status', () => {
    expect(formatEpisodeStatusLabel('unknown' as never)).toBe('deaktiviert')
  })
})
