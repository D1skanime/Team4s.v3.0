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
  it('returns default message when no factual fields are present', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      status: 'active',
      slug: 'test-fansub',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('aktiv')
  })

  it('builds a combined summary from years, country, and status', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      slug: 'test-fansub',
      status: 'active',
      founded_year: 2008,
      country: 'Schweiz',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('gegründet 2008 • Schweiz • aktiv')
  })

  it('uses year range when founded and dissolved are known', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      slug: 'test-fansub',
      status: 'dissolved',
      founded_year: 2001,
      dissolved_year: 2014,
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('2001 bis 2014 • aufgelöst')
  })

  it('falls back to country only when no year is set', () => {
    const group: FansubGroup = {
      id: 1,
      name: 'Test Fansub',
      slug: 'test-fansub',
      status: 'inactive',
      country: 'Deutschland',
    } as FansubGroup
    expect(buildFansubStoryPreview(group)).toBe('Deutschland • inaktiv')
  })
})
