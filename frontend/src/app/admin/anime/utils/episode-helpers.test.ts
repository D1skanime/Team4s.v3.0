import { describe, expect, it } from 'vitest'

import { EpisodeListItem } from '@/types/anime'
import { FansubGroup } from '@/types/fansub'

import { suggestNextEpisodeNumber, buildFansubStoryPreview } from './episode-helpers'

function buildEpisode(episode_number: string | null): EpisodeListItem {
  return {
    id: 1,
    episode_number: episode_number ?? '',
    status: 'public',
    view_count: 0,
    download_count: 0,
  }
}

describe('suggestNextEpisodeNumber', () => {
  it('returns null for empty episode list', () => {
    expect(suggestNextEpisodeNumber([])).toBeNull()
  })

  it('returns null when no numeric episodes exist', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('OVA'), id: 1 },
      { ...buildEpisode('Special'), id: 2 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBeNull()
  })

  it('returns null when episode numbers are empty', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode(''), id: 1 },
      { ...buildEpisode(null), id: 2 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBeNull()
  })

  it('suggests next number based on max numeric episode', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('01'), id: 1 },
      { ...buildEpisode('02'), id: 2 },
      { ...buildEpisode('03'), id: 3 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBe('04')
  })

  it('preserves zero-padding width', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('001'), id: 1 },
      { ...buildEpisode('002'), id: 2 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBe('003')
  })

  it('uses minimum width of 2 digits', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('1'), id: 1 },
      { ...buildEpisode('2'), id: 2 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBe('03')
  })

  it('ignores non-numeric episode numbers', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('01'), id: 1 },
      { ...buildEpisode('OVA'), id: 2 },
      { ...buildEpisode('05'), id: 3 },
      { ...buildEpisode('Special'), id: 4 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBe('06')
  })

  it('handles whitespace in episode numbers', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('  01  '), id: 1 },
      { ...buildEpisode('  02  '), id: 2 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBe('03')
  })

  it('ignores zero and negative numbers', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('0'), id: 1 },
      { ...buildEpisode('5'), id: 2 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBe('06')
  })

  it('handles mixed numeric and special episodes', () => {
    const episodes: EpisodeListItem[] = [
      { ...buildEpisode('12'), id: 1 },
      { ...buildEpisode('12.5'), id: 2 },
      { ...buildEpisode('13'), id: 3 },
    ]
    expect(suggestNextEpisodeNumber(episodes)).toBe('14')
  })
})

describe('buildFansubStoryPreview', () => {
  it('returns default message for group with no history or description', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      description: null,
      history: null,
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Keine Historie hinterlegt.')
  })

  it('returns default message for empty strings', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      description: '',
      history: '',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Keine Historie hinterlegt.')
  })

  it('returns default message for whitespace-only strings', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      description: '   ',
      history: '   ',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Keine Historie hinterlegt.')
  })

  it('prefers history over description', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      description: 'This is the description',
      history: 'This is the history',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('This is the history')
  })

  it('falls back to description when history is empty', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      description: 'This is the description',
      history: '',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('This is the description')
  })

  it('falls back to description when history is null', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      description: 'This is the description',
      history: null,
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('This is the description')
  })

  it('normalizes Windows-style line endings', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: 'Line 1\r\nLine 2\r\nLine 3',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Line 1\nLine 2\nLine 3')
  })

  it('normalizes old Mac-style line endings', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: 'Line 1\rLine 2\rLine 3',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Line 1\nLine 2\nLine 3')
  })

  it('collapses multiple blank lines to double newline', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: 'Paragraph 1\n\n\n\n\nParagraph 2',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Paragraph 1\n\nParagraph 2')
  })

  it('trims leading and trailing whitespace', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: '   Content here   ',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Content here')
  })

  it('returns full text when under 420 characters', () => {
    const shortText = 'This is a short history.'
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: shortText,
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe(shortText)
  })

  it('truncates text longer than 420 characters with ellipsis', () => {
    const longText = 'A'.repeat(500)
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: longText,
    } as FansubGroup
    const result = buildFansubStoryPreview(group)
    expect(result.length).toBeLessThanOrEqual(423)
    expect(result).toMatch(/\.\.\.$/u)
  })

  it('trims trailing whitespace before adding ellipsis', () => {
    const textWithTrailingSpaces = 'A'.repeat(418) + '   more text here'
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: textWithTrailingSpaces,
    } as FansubGroup
    const result = buildFansubStoryPreview(group)
    expect(result).not.toMatch(/\s\.\.\.$/u)
    expect(result).toMatch(/\.\.\.$/u)
  })

  it('handles exactly 420 characters without truncation', () => {
    const exactText = 'A'.repeat(420)
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      history: exactText,
    } as FansubGroup
    const result = buildFansubStoryPreview(group)
    expect(result).toBe(exactText)
    expect(result.length).toBe(420)
  })
})
