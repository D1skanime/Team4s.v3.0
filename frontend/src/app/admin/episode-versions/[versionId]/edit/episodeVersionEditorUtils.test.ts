import { describe, expect, it } from 'vitest'

import {
  buildInitialFormState,
  buildSnapshot,
  formatDurationInput,
  normalizeCRC32Draft,
  parseDurationInput,
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

describe('release version crc32 helpers', () => {
  it('normalizes crc32 drafts to uppercase', () => {
    expect(normalizeCRC32Draft(' 1cc0a2e3 ')).toBe('1CC0A2E3')
  })

  it('includes crc32 in initial form state and snapshots', () => {
    const formState = buildInitialFormState({
      version: {
        id: 1,
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
    })

    expect(formState.crc32).toBe('1CC0A2E3')
    expect(buildSnapshot(formState, [])).toContain('"crc32":"1CC0A2E3"')
  })
})
