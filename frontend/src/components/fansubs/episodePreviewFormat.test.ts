import { describe, expect, it } from 'vitest'

import {
  classificationAndTypeLine,
  formatReleaseDateLine,
  formatSubtitleType,
  formatTechValue,
  formatVersionCountLabel,
  resolveCoopLinkGroupId,
  resolveEpisodeTitle,
  resolveLogoUrl,
  resolveReleaseName,
} from './episodePreviewFormat'

describe('classificationAndTypeLine', () => {
  it('GAP-11: returns only the DB-sourced episode_type_label when filler_type code is unknown', () => {
    expect(classificationAndTypeLine({
      filler_type: 'unknown', filler_type_label: 'Unbekannt', episode_type_label: 'Episode',
    })).toBe('Episode')
  })

  it('GAP-11: joins the DB-sourced filler_type_label and episode_type_label with a middle dot otherwise', () => {
    expect(classificationAndTypeLine({
      filler_type: 'filler', filler_type_label: 'Zusatzfolge', episode_type_label: 'Episode',
    })).toBe('Zusatzfolge · Episode')
  })
})

describe('formatVersionCountLabel', () => {
  it('uses singular for 1, plural otherwise, never a "+" prefix', () => {
    expect(formatVersionCountLabel(1)).toBe('1 Version')
    expect(formatVersionCountLabel(3)).toBe('3 Versionen')
  })
})

describe('formatTechValue', () => {
  it('GAP-03: returns null for null/undefined/empty (omit, never "Unbekannt"), passes through otherwise', () => {
    expect(formatTechValue(null)).toBeNull()
    expect(formatTechValue(undefined)).toBeNull()
    expect(formatTechValue('')).toBeNull()
    expect(formatTechValue('1080p')).toBe('1080p')
  })
})

describe('formatSubtitleType', () => {
  it('GAP-03: maps softsub/hardsub, returns null for missing values (omit, never "Unbekannt")', () => {
    expect(formatSubtitleType('softsub')).toBe('Softsub')
    expect(formatSubtitleType('hardsub')).toBe('Hardsub')
    expect(formatSubtitleType(null)).toBeNull()
    expect(formatSubtitleType(undefined)).toBeNull()
  })
})

describe('techLine construction (ReleasePreviewRow-level, GAP-03)', () => {
  function buildTechLine(values: Array<string | null>): string {
    return values.filter((value): value is string => value !== null).join(' · ')
  }

  it('produces an empty line (omit the whole techLine paragraph) when all four values are missing', () => {
    const line = buildTechLine([
      formatTechValue(undefined),
      formatTechValue(null),
      formatTechValue(''),
      formatSubtitleType(null),
    ])
    expect(line).toBe('')
  })

  it('renders only the one present value, with no stray "·" separators', () => {
    const line = buildTechLine([
      formatTechValue('1080p'),
      formatTechValue(null),
      formatTechValue(undefined),
      formatSubtitleType(undefined),
    ])
    expect(line).toBe('1080p')
  })
})

describe('formatReleaseDateLine', () => {
  it('returns null for missing/invalid dates (signals: omit the whole line)', () => {
    expect(formatReleaseDateLine(null)).toBeNull()
    expect(formatReleaseDateLine(undefined)).toBeNull()
    expect(formatReleaseDateLine('not-a-date')).toBeNull()
  })

  it('formats a populated date as "Fansub-Release vom DD.MM.YYYY"', () => {
    expect(formatReleaseDateLine('2012-04-12T00:00:00Z')).toBe('Fansub-Release vom 12.04.2012')
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
    filler_type_label: 'Unbekannt', episode_type_label: 'Episode',
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
  it('GAP-02: returns the backend-computed release_name verbatim, no more title/"Release #" logic', () => {
    expect(resolveReleaseName({ release_name: 'Episode 1 · (Strawhat Subs) · v1' } as never)).toBe(
      'Episode 1 · (Strawhat Subs) · v1',
    )
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

  it('re-sorts defensively when the array does not arrive pre-sorted (164-06 Task 2)', () => {
    expect(resolveCoopLinkGroupId([
      { id: 5, slug: 'zeta', name: 'Zeta' },
      { id: 2, slug: 'alpha', name: 'Alpha' },
    ])).toBe(2)
  })

  it('returns the only group id in the single-group case, unchanged behaviour', () => {
    expect(resolveCoopLinkGroupId([{ id: 7, slug: 'solo', name: 'Solo' }])).toBe(7)
  })

  it('breaks a name tie by the lower id, matching the backend ORDER BY fg.name, fg.id', () => {
    expect(resolveCoopLinkGroupId([
      { id: 9, slug: 'a2', name: 'Alpha' },
      { id: 3, slug: 'a1', name: 'Alpha' },
    ])).toBe(3)
  })
})
