import { describe, expect, it } from 'vitest'

import {
  classificationAndTypeLine,
  classificationLabel,
  episodeTypeLabel,
  formatReleaseDateLine,
  formatSubtitleType,
  formatTechValue,
  formatVersionCountLabel,
  resolveCoopLinkGroupId,
  resolveEpisodeTitle,
  resolveLogoUrl,
  resolveReleaseName,
} from './episodePreviewFormat'

describe('classificationLabel', () => {
  it('maps every filler_type to the correct German label, unknown to null', () => {
    expect(classificationLabel('canon')).toBe('Haupthandlung')
    expect(classificationLabel('filler')).toBe('Filler')
    expect(classificationLabel('mixed')).toBe('Gemischt')
    expect(classificationLabel('recap')).toBe('Rückblick')
    expect(classificationLabel('unknown')).toBeNull()
  })
})

describe('episodeTypeLabel', () => {
  it('maps every episode_type to the correct German label', () => {
    expect(episodeTypeLabel('episode')).toBe('Episode')
    expect(episodeTypeLabel('special')).toBe('Special')
    expect(episodeTypeLabel('ova')).toBe('OVA')
    expect(episodeTypeLabel('ona')).toBe('ONA')
    expect(episodeTypeLabel('movie')).toBe('Film')
    expect(episodeTypeLabel('recap')).toBe('Rückblickfolge')
    expect(episodeTypeLabel('preview')).toBe('Vorschau')
    expect(episodeTypeLabel('prologue')).toBe('Prolog')
    expect(episodeTypeLabel('epilogue')).toBe('Epilog')
    expect(episodeTypeLabel('bonus')).toBe('Bonus')
  })

  it('uses a distinct label from classificationLabel for the shared recap string', () => {
    expect(episodeTypeLabel('recap')).not.toBe(classificationLabel('recap'))
  })
})

describe('classificationAndTypeLine', () => {
  it('returns only the type label when filler_type is unknown', () => {
    expect(classificationAndTypeLine('unknown', 'episode')).toBe('Episode')
  })

  it('joins classification and type with a middle dot otherwise', () => {
    expect(classificationAndTypeLine('filler', 'ova')).toBe('Filler · OVA')
  })
})

describe('formatVersionCountLabel', () => {
  it('uses singular for 1, plural otherwise, never a "+" prefix', () => {
    expect(formatVersionCountLabel(1)).toBe('1 Version')
    expect(formatVersionCountLabel(3)).toBe('3 Versionen')
  })
})

describe('formatTechValue', () => {
  it('falls back to Unbekannt for null/undefined/empty, passes through otherwise', () => {
    expect(formatTechValue(null)).toBe('Unbekannt')
    expect(formatTechValue(undefined)).toBe('Unbekannt')
    expect(formatTechValue('')).toBe('Unbekannt')
    expect(formatTechValue('1080p')).toBe('1080p')
  })
})

describe('formatSubtitleType', () => {
  it('maps softsub/hardsub, falls back to the same Unbekannt word as formatTechValue', () => {
    expect(formatSubtitleType('softsub')).toBe('Softsub')
    expect(formatSubtitleType('hardsub')).toBe('Hardsub')
    expect(formatSubtitleType(null)).toBe('Unbekannt')
    expect(formatSubtitleType(undefined)).toBe('Unbekannt')
  })
})

describe('formatReleaseDateLine', () => {
  it('returns null for missing/invalid dates (signals: omit the whole line)', () => {
    expect(formatReleaseDateLine(null)).toBeNull()
    expect(formatReleaseDateLine(undefined)).toBeNull()
    expect(formatReleaseDateLine('not-a-date')).toBeNull()
  })

  it('formats a populated date as "Veroeffentlicht am DD.MM.YYYY"', () => {
    expect(formatReleaseDateLine('2012-04-12T00:00:00Z')).toBe('Veröffentlicht am 12.04.2012')
  })
})

describe('resolveLogoUrl', () => {
  it('returns null for empty/missing values', () => {
    expect(resolveLogoUrl(null)).toBeNull()
    expect(resolveLogoUrl(undefined)).toBeNull()
    expect(resolveLogoUrl('   ')).toBeNull()
  })

  it('passes through absolute/rooted URLs unchanged', () => {
    expect(resolveLogoUrl('https://cdn.example.com/logo.png')).toBe('https://cdn.example.com/logo.png')
    expect(resolveLogoUrl('/media/logo.png')).toBe('/media/logo.png')
  })

  it('prefixes bare filenames with /covers/', () => {
    expect(resolveLogoUrl('logo.png')).toBe('/covers/logo.png')
  })
})

describe('resolveEpisodeTitle', () => {
  const baseEpisode = {
    episode_id: 1, episode_number: 3, version_count: 0, versions: [],
    filler_type: 'unknown' as const, episode_type: 'episode' as const,
  }

  it('prefers the explicit episode title', () => {
    expect(resolveEpisodeTitle({ ...baseEpisode, episode_title: 'Explizit' }, null)).toBe('Explizit')
  })

  it('falls back to the summary version title', () => {
    expect(resolveEpisodeTitle(baseEpisode, { title: 'Aus Version' } as never)).toBe('Aus Version')
  })

  it('falls back to "Folge N" when nothing else is available', () => {
    expect(resolveEpisodeTitle(baseEpisode, null)).toBe('Folge 3')
  })
})

describe('resolveReleaseName', () => {
  it('prefers the explicit release title', () => {
    expect(resolveReleaseName({ title: 'Mein Release', release_version_id: 5 } as never)).toBe('Mein Release')
  })

  it('falls back to "Release #ID"', () => {
    expect(resolveReleaseName({ title: null, release_version_id: 5 } as never)).toBe('Release #5')
  })
})

describe('resolveCoopLinkGroupId', () => {
  it('returns the id of the first (alphabetically-sorted) group', () => {
    expect(resolveCoopLinkGroupId([{ id: 7, slug: 'a', name: 'A' }, { id: 9, slug: 'b', name: 'B' }])).toBe(7)
  })

  it('returns null when there are no groups', () => {
    expect(resolveCoopLinkGroupId([])).toBeNull()
    expect(resolveCoopLinkGroupId(undefined)).toBeNull()
  })
})
