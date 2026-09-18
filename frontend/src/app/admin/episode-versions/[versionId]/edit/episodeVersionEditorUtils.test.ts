import { describe, expect, it } from 'vitest'

import {
  buildInitialFormState,
  buildSnapshot,
  defaultReleaseTitle,
  formatDurationInput,
  fromDateInputValue,
  normalizeCRC32Draft,
  parseDurationInput,
  toDateInputValue,
  releaseDateOrderHints,
  validateReleaseDateOrder,
} from './episodeVersionEditorUtils'

describe('parseDurationInput', () => {
  it('parses raw seconds', () => {
    expect(parseDurationInput('1450')).toBe(1450)
  })

  it('parses minute-second shorthand', () => {
    expect(parseDurationInput('24:10')).toBe(1450)
  })

  it('parses hour-minute-second input', () => {
    expect(parseDurationInput('1:01:20')).toBe(3680)
  })

  it('parses minute shorthand with and without suffix', () => {
    expect(parseDurationInput('2m')).toBe(120)
    expect(parseDurationInput('1m30')).toBe(90)
    expect(parseDurationInput('1m30s')).toBe(90)
  })

  it('rejects malformed duration strings', () => {
    expect(parseDurationInput('')).toBeNull()
    expect(parseDurationInput('abc')).toBeNull()
    expect(parseDurationInput('1m90s')).toBeNull()
    expect(parseDurationInput('25:99')).toBeNull()
  })
})

describe('formatDurationInput', () => {
  it('formats under one hour as m:ss', () => {
    expect(formatDurationInput(90)).toBe('1:30')
    expect(formatDurationInput(1450)).toBe('24:10')
  })

  it('formats one hour and above as h:mm:ss', () => {
    expect(formatDurationInput(3680)).toBe('1:01:20')
  })
})

describe('defaultReleaseTitle', () => {
  const baseVersion = {
    id: 1, variant_id: 1, release_version_id: 10, anime_id: 2, episode_number: 1,
    media_provider: '', media_item_id: '', segment_count: 0, has_segment_asset: false,
    created_at: '', updated_at: '', release_version: 'v1',
  }

  it('GAP-02: mirrors the coop-capable "<Episodentitel> · (<Gruppe A> × <Gruppe B>) · <Version>" format for two groups, sorted by name then id', () => {
    const context = {
      anime_title: 'Fixture',
      version: baseVersion,
      selected_groups: [
        { id: 9, slug: 'group-b', name: 'GroupB' },
        { id: 2, slug: 'group-a', name: 'GroupA' },
      ],
      date_neighbors: [],
    }
    expect(defaultReleaseTitle(context)).toBe('Episode 001 · (GroupA × GroupB) · v1')
  })

  it('GAP-02: still wraps a single group name in parens, no special-case for count===1', () => {
    const context = {
      anime_title: 'Fixture',
      version: baseVersion,
      selected_groups: [{ id: 5, slug: 'group-name', name: 'GroupName' }],
      date_neighbors: [],
    }
    expect(defaultReleaseTitle(context)).toBe('Episode 001 · (GroupName) · v1')
  })
})

describe('release version crc32 helpers', () => {
  it('normalizes crc32 drafts to uppercase', () => {
    expect(normalizeCRC32Draft(' 1cc0a2e3 ')).toBe('1CC0A2E3')
  })

  it('includes crc32 in initial form state and snapshots', () => {
    const formState = buildInitialFormState({
      version: {
        id: 1,
        variant_id: 1,
        release_version_id: 10,
        segment_count: 0,
        has_segment_asset: false,
        anime_id: 2,
        episode_number: 1,
        media_provider: 'jellyfin',
        media_item_id: 'media-1',
        video_quality: '720p',
        subtitle_type: 'hardsub',
        release_date: null,
        crc32: '1CC0A2E3',
        created_at: '2026-07-03T08:00:00Z',
        updated_at: '2026-07-03T08:00:00Z',
      },
      anime_title: 'Vipers Creed',
      selected_groups: [],
      date_neighbors: [],
    })

    expect(formState.crc32).toBe('1CC0A2E3')
    expect(buildSnapshot(formState, [])).toContain('"crc32":"1CC0A2E3"')
  })
})

describe('WR-05 (164 Code-Review): isTechnicalReleaseFilename must match the backend video-extension whitelist', () => {
  const baseVersionForTitle = {
    id: 1, variant_id: 1, release_version_id: 10, anime_id: 2, episode_number: 1,
    media_provider: '', media_item_id: '', segment_count: 0, has_segment_asset: false,
    created_at: '', updated_at: '', release_version: 'v1',
  }

  function initialTitleFor(title: string): string {
    return buildInitialFormState({
      version: { ...baseVersionForTitle, title },
      anime_title: 'Fixture',
      selected_groups: [],
      date_neighbors: [],
    }).title
  }

  it('does not blank out a genuine, group-entered title that merely ends in a period plus digits', () => {
    expect(initialTitleFor('OVA.01')).toBe('OVA.01')
    expect(initialTitleFor('Special.02')).toBe('Special.02')
  })

  it('still blanks out an actual raw video filename with a known container extension', () => {
    expect(initialTitleFor('Naruto.S01E01-AnimeOwnage.mkv')).toBe('')
    expect(initialTitleFor('some-release.avi')).toBe('')
    expect(initialTitleFor('some-release.mp4')).toBe('')
  })
})

describe('release version date helpers', () => {
  it('formats API release dates as date-only picker values', () => {
    expect(toDateInputValue('2010-11-14T00:00:00.000Z')).toBe('2010-11-14')
  })

  it('converts date-only picker values to ISO strings', () => {
    expect(fromDateInputValue('2010-11-14')).toBe('2010-11-14T00:00:00.000Z')
  })

  it('rejects malformed date-only values', () => {
    expect(fromDateInputValue('2010-99-99')).toBeNull()
    expect(fromDateInputValue('14.11.2010')).toBeNull()
  })
})


describe('own release calendar order', () => {
  it.each([
    ['2013-07-18', '2013-07-17', true],
    ['2013-07-18', '2013-07-18', false],
    ['2013-07-18', '2013-07-19', false],
    ['', '2013-07-17', false],
    ['2013-07-18', '', false],
    ['', '', false],
    ['2013-02-30', '', true],
  ])('validates %s through %s (invalid=%s)', (productionStartedOn, releaseDate, invalid) => {
    expect(Boolean(validateReleaseDateOrder({ productionStartedOn, releaseDate }))).toBe(invalid)
  })
})

describe('cross-episode date advice', () => {
  const context = {
    anime_title: 'Fixture',
    version: { id: 3, variant_id: 3, release_version_id: 903, anime_id: 1, episode_number: 3,
      media_provider: '', media_item_id: '', segment_count: 0, has_segment_asset: false,
      created_at: '', updated_at: '' },
    selected_groups: [{ id: 1, name: 'Gruppe A', slug: 'gruppe-a', logo_url: null }],
    date_neighbors: [
      { fansub_group_id: 1, field: 'production_started_on' as const, direction: 'previous' as const,
        release_version_id: 902, episode_number: '2', date: '2013-07-18' },
      { fansub_group_id: 1, field: 'production_started_on' as const, direction: 'next' as const,
        release_version_id: 906, episode_number: '6', date: '2013-07-19' },
    ],
  }
  it.each(['2013-07-18', '2013-07-19', ''])('allows missing dates and inclusive anchors: %s', (productionStartedOn) => {
    expect(releaseDateOrderHints(context, { productionStartedOn, releaseDate: '' })).toEqual([])
  })
  it('names the actual earlier dated episode across gaps without blocking a valid own pair', () => {
    const form = { productionStartedOn: '2013-07-17', releaseDate: '2013-07-20' }
    expect(releaseDateOrderHints(context, form)).toEqual([
      'Bearbeitungsbeginn: Das Datum liegt vor dem Beginn von Folge 2 (Gruppe A) am 18.07.2013.',
    ])
    expect(validateReleaseDateOrder(form)).toBeNull()
  })
  it('uses the later anchor across missing episodes', () => {
    expect(releaseDateOrderHints(context, { productionStartedOn: '2013-07-20', releaseDate: '' })[0])
      .toContain('nach dem Beginn von Folge 6 (Gruppe A) am 19.07.2013')
  })
  it('never compares completion with start or removed groups', () => {
    expect(releaseDateOrderHints(context, { productionStartedOn: '', releaseDate: '2013-07-01' })).toEqual([])
    expect(releaseDateOrderHints(context, { productionStartedOn: '2013-07-01', releaseDate: '' }, [])).toEqual([])
  })
  it('uses completion anchors only for completion and leaves the input unchanged', () => {
    const form = { productionStartedOn: '', releaseDate: '2013-07-17' }
    const completionContext = { ...context, date_neighbors: context.date_neighbors.map(anchor => ({
      ...anchor, field: 'release_date' as const,
    })) }
    expect(releaseDateOrderHints(completionContext, form)[0]).toContain('vor dem Abschluss von Folge 2')
    expect(form).toEqual({ productionStartedOn: '', releaseDate: '2013-07-17' })
  })
})
