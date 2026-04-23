import { describe, expect, it } from 'vitest'

import type { EpisodeImportMappingRow, EpisodeImportPreviewResult } from '../../../../../../types/episodeImport'
import {
  applyFansubGroupFromEpisodeDown,
  applyFansubGroupToEpisodeRows,
  confirmEpisodeMappingRows,
  detectMappingConflicts,
  fillerLabel,
  markAllSuggestedConfirmed,
  markAllSuggestedSkipped,
  markMappingSkipped,
  resolveEpisodeDisplayTitle,
  setMappingTargets,
  skipEpisodeMappingRows,
  summarizeImportPreview,
} from './episodeImportMapping'
import { buildEpisodeImportApplyInput } from './useEpisodeImportBuilder'

describe('episodeImportMapping', () => {
  it('confirms one media candidate for multiple canonical episodes without duplicating the row', () => {
    const rows: EpisodeImportMappingRow[] = [{
      media_item_id: 'jellyfin-naruto-009-010',
      target_episode_numbers: [9],
      suggested_episode_numbers: [9],
      status: 'suggested',
    }]

    const result = setMappingTargets(rows, 'jellyfin-naruto-009-010', '9,10')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      media_item_id: 'jellyfin-naruto-009-010',
      target_episode_numbers: [9, 10],
      status: 'confirmed',
    })
  })

  it('marks skipped rows as allowed non-persistent mappings', () => {
    const rows: EpisodeImportMappingRow[] = [{
      media_item_id: 'jellyfin-extra-creditless-op',
      target_episode_numbers: [1],
      suggested_episode_numbers: [1],
      status: 'suggested',
    }]

    const result = markMappingSkipped(rows, 'jellyfin-extra-creditless-op')

    expect(result[0]).toMatchObject({
      target_episode_numbers: [],
      status: 'skipped',
    })
  })

  it('allows different active media rows to claim the same canonical episode as parallel releases', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'jellyfin-a',
        target_episode_numbers: [9],
        suggested_episode_numbers: [9],
        status: 'confirmed',
      },
      {
        media_item_id: 'jellyfin-b',
        target_episode_numbers: [9],
        suggested_episode_numbers: [9],
        status: 'confirmed',
      },
    ]

    const result = detectMappingConflicts(rows)

    expect(result.map((row) => row.status)).toEqual(['confirmed', 'confirmed'])
  })

  it('summarizes preview counts without hiding unmapped episodes or files', () => {
    const preview: EpisodeImportPreviewResult = {
      anime_id: 42,
      anime_title: 'Test Anime',
      canonical_episodes: [{ episode_number: 1 }, { episode_number: 2 }],
      media_candidates: [
        { media_item_id: 'jellyfin-1', file_name: 'Episode 1.mkv', path: '/anime/Episode 1.mkv' },
      ],
      mappings: [{
        media_item_id: 'jellyfin-1',
        target_episode_numbers: [1],
        suggested_episode_numbers: [1],
        status: 'suggested',
      }],
      unmapped_episodes: [2],
      unmapped_media_item_ids: ['jellyfin-extra'],
    }

    expect(summarizeImportPreview(preview)).toMatchObject({
      canonical_episode_count: 2,
      media_candidate_count: 1,
      suggested_count: 1,
      unmapped_episode_count: 1,
      unmapped_media_count: 1,
    })
  })

  // --- Batch resolution helpers ---

  it('markAllSuggestedSkipped skips every suggested row without touching confirmed or already-skipped rows', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'file-a',
        target_episode_numbers: [1],
        suggested_episode_numbers: [1],
        status: 'suggested',
      },
      {
        media_item_id: 'file-b',
        target_episode_numbers: [2],
        suggested_episode_numbers: [2],
        status: 'confirmed',
      },
      {
        media_item_id: 'file-c',
        target_episode_numbers: [],
        suggested_episode_numbers: [3],
        status: 'skipped',
      },
    ]

    const result = markAllSuggestedSkipped(rows)

    expect(result.find((r) => r.media_item_id === 'file-a')?.status).toBe('skipped')
    expect(result.find((r) => r.media_item_id === 'file-b')?.status).toBe('confirmed')
    expect(result.find((r) => r.media_item_id === 'file-c')?.status).toBe('skipped')
  })

  it('markAllSuggestedConfirmed confirms every suggested row using its existing target episode numbers', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'file-a',
        target_episode_numbers: [1],
        suggested_episode_numbers: [1],
        status: 'suggested',
      },
      {
        media_item_id: 'file-b',
        target_episode_numbers: [2],
        suggested_episode_numbers: [2],
        status: 'suggested',
      },
    ]

    const result = markAllSuggestedConfirmed(rows)

    expect(result.every((r) => r.status === 'confirmed')).toBe(true)
  })

  it('markAllSuggestedConfirmed promotes parallel releases for same episode without flagging conflicts', () => {
    // Two different files both suggested for episode 1 (parallel releases)
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'release-group-a-ep1',
        target_episode_numbers: [1],
        suggested_episode_numbers: [1],
        status: 'suggested',
      },
      {
        media_item_id: 'release-group-b-ep1',
        target_episode_numbers: [1],
        suggested_episode_numbers: [1],
        status: 'suggested',
      },
    ]

    const result = markAllSuggestedConfirmed(rows)

    expect(result.map((r) => r.status)).toEqual(['confirmed', 'confirmed'])
  })

  it('confirmEpisodeMappingRows confirms only rows suggested for that episode number', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'file-ep1',
        target_episode_numbers: [1],
        suggested_episode_numbers: [1],
        status: 'suggested',
      },
      {
        media_item_id: 'file-ep2',
        target_episode_numbers: [2],
        suggested_episode_numbers: [2],
        status: 'suggested',
      },
    ]

    const result = confirmEpisodeMappingRows(rows, 1)

    expect(result.find((r) => r.media_item_id === 'file-ep1')?.status).toBe('confirmed')
    expect(result.find((r) => r.media_item_id === 'file-ep2')?.status).toBe('suggested')
  })

  it('skipEpisodeMappingRows skips only rows suggested for that episode number', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'file-ep1',
        target_episode_numbers: [1],
        suggested_episode_numbers: [1],
        status: 'suggested',
      },
      {
        media_item_id: 'file-ep3',
        target_episode_numbers: [3],
        suggested_episode_numbers: [3],
        status: 'confirmed',
      },
    ]

    const result = skipEpisodeMappingRows(rows, 1)

    expect(result.find((r) => r.media_item_id === 'file-ep1')?.status).toBe('skipped')
    expect(result.find((r) => r.media_item_id === 'file-ep3')?.status).toBe('confirmed')
  })

  // --- Filler display helpers ---

  it('fillerLabel returns null for canon episodes so no badge is shown', () => {
    expect(fillerLabel('canon')).toBeNull()
    expect(fillerLabel(null)).toBeNull()
    expect(fillerLabel(undefined)).toBeNull()
  })

  it('fillerLabel returns localized labels for non-canon filler types', () => {
    expect(fillerLabel('filler')).toBe('Filler')
    expect(fillerLabel('mixed')).toBe('Gemischt')
    expect(fillerLabel('recap')).toBe('Recap')
    expect(fillerLabel('unknown')).toBe('Unbekannt')
  })

  // --- Canonical episode title resolution ---

  it('resolveEpisodeDisplayTitle prefers German over other languages', () => {
    const ep = {
      episode_number: 5,
      titles_by_language: { de: 'Schicksalstag', en: 'Day of Destiny', ja: '運命の日' },
    }
    expect(resolveEpisodeDisplayTitle(ep)).toBe('Schicksalstag')
  })

  it('resolveEpisodeDisplayTitle does not surface non-German variants when German is absent', () => {
    const ep = {
      episode_number: 5,
      titles_by_language: { en: 'Day of Destiny', ja: '運命の日' },
    }
    expect(resolveEpisodeDisplayTitle(ep)).toBeNull()
  })

  it('resolveEpisodeDisplayTitle falls back to title field when no language map is present', () => {
    const ep = {
      episode_number: 5,
      title: 'Day of Destiny',
    }
    expect(resolveEpisodeDisplayTitle(ep)).toBe('Day of Destiny')
  })

  it('resolveEpisodeDisplayTitle falls back to existing_title when title and language map are absent', () => {
    const ep = {
      episode_number: 5,
      existing_title: 'Existing cached title',
    }
    expect(resolveEpisodeDisplayTitle(ep)).toBe('Existing cached title')
  })

  it('resolveEpisodeDisplayTitle returns null when no title data is available', () => {
    const ep = { episode_number: 5 }
    expect(resolveEpisodeDisplayTitle(ep)).toBeNull()
  })

  // --- Release metadata field preservation ---

  it('setMappingTargets preserves existing fansub groups and release_version on the row', () => {
    const rows: EpisodeImportMappingRow[] = [{
      media_item_id: 'jellyfin-ep1',
      target_episode_numbers: [1],
      suggested_episode_numbers: [1],
      status: 'suggested',
      fansub_groups: [{ name: '[Commie]' }, { id: 8, name: 'Dual', slug: 'dual' }],
      release_version: 'v2',
    }]

    const result = setMappingTargets(rows, 'jellyfin-ep1', '1,2')

    expect(result[0].fansub_groups).toEqual([
      { name: '[Commie]' },
      { id: 8, name: 'Dual', slug: 'dual' },
    ])
    expect(result[0].release_version).toBe('v2')
    expect(result[0].target_episode_numbers).toEqual([1, 2])
  })

  it('markMappingSkipped preserves release metadata on the skipped row', () => {
    const rows: EpisodeImportMappingRow[] = [{
      media_item_id: 'jellyfin-ep5',
      target_episode_numbers: [5],
      suggested_episode_numbers: [5],
      status: 'suggested',
      fansub_groups: [{ name: '[HorribleSubs]' }],
      release_version: null,
    }]

    const result = markMappingSkipped(rows, 'jellyfin-ep5')

    expect(result[0].status).toBe('skipped')
    expect(result[0].fansub_groups).toEqual([{ name: '[HorribleSubs]' }])
  })

  // --- Naruto-scale bulk mapping controls ---

  it('markAllSuggestedConfirmed does not erase multi-target coverage for combined-file rows', () => {
    // Simulates a Naruto combined file covering episodes 9 and 10
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'naruto-s01e09-010',
        target_episode_numbers: [9, 10],
        suggested_episode_numbers: [9],
        status: 'suggested',
      },
      {
        media_item_id: 'naruto-s01e011',
        target_episode_numbers: [11],
        suggested_episode_numbers: [11],
        status: 'suggested',
      },
    ]

    const result = markAllSuggestedConfirmed(rows)

    const combined = result.find((r) => r.media_item_id === 'naruto-s01e09-010')
    expect(combined?.status).toBe('confirmed')
    // Multi-target coverage must be preserved exactly
    expect(combined?.target_episode_numbers).toEqual([9, 10])

    expect(result.find((r) => r.media_item_id === 'naruto-s01e011')?.status).toBe('confirmed')
  })

  it('markAllSuggestedSkipped does not affect already-confirmed multi-target rows', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'naruto-s01e09-010',
        target_episode_numbers: [9, 10],
        suggested_episode_numbers: [9],
        status: 'confirmed',
      },
      {
        media_item_id: 'naruto-s01e012',
        target_episode_numbers: [12],
        suggested_episode_numbers: [12],
        status: 'suggested',
      },
    ]

    const result = markAllSuggestedSkipped(rows)

    const combined = result.find((r) => r.media_item_id === 'naruto-s01e09-010')
    expect(combined?.status).toBe('confirmed')
    expect(combined?.target_episode_numbers).toEqual([9, 10])

    expect(result.find((r) => r.media_item_id === 'naruto-s01e012')?.status).toBe('skipped')
  })

  it('canApply equivalent: all rows confirmed or skipped enables apply', () => {
    // Simulates the canApply condition from the hook
    const rows: EpisodeImportMappingRow[] = [
      { media_item_id: 'ep1', target_episode_numbers: [1], suggested_episode_numbers: [1], status: 'confirmed' },
      { media_item_id: 'ep2', target_episode_numbers: [2, 3], suggested_episode_numbers: [2], status: 'confirmed' },
      { media_item_id: 'ep4', target_episode_numbers: [], suggested_episode_numbers: [4], status: 'skipped' },
    ]

    const canApply = rows.every((r) => r.status === 'confirmed' || r.status === 'skipped')
    expect(canApply).toBe(true)
  })

  it('canApply equivalent: rows with suggested status block apply', () => {
    const rows: EpisodeImportMappingRow[] = [
      { media_item_id: 'ep1', target_episode_numbers: [1], suggested_episode_numbers: [1], status: 'confirmed' },
      { media_item_id: 'ep2', target_episode_numbers: [2], suggested_episode_numbers: [2], status: 'suggested' },
    ]

    const canApply = rows.every((r) => r.status === 'confirmed' || r.status === 'skipped')
    expect(canApply).toBe(false)
  })

  it('resolveEpisodeDisplayTitle shows only the German title in the UI when multiple languages exist', () => {
    expect(resolveEpisodeDisplayTitle({
      episode_number: 3,
      title: 'Toplist #1628',
      titles_by_language: {
        de: 'Sasukes Rivale',
        en: 'Sasuke and Sakura: Friends or Foes?',
        ja: '対決! サスケVSサクラ',
      },
    })).toBe('Sasukes Rivale')
  })

  it('resolveEpisodeDisplayTitle falls back without surfacing non-German variants', () => {
    expect(resolveEpisodeDisplayTitle({
      episode_number: 4,
      title: 'Episode 4',
      titles_by_language: {
        en: 'Pass or Fail: Survival Test',
        ja: '試練! サバイバル演習',
      },
      existing_title: 'Lokaler Titel',
    })).toBe('Episode 4')
  })

  it('setMappingTargets accepts comma-list season-offset corrections like "141" from a season-split library', () => {
    // Simulates operator correcting a Jellyfin Season 6 Episode 1 to canonical episode 141
    const rows: EpisodeImportMappingRow[] = [{
      media_item_id: 'naruto-s06e01',
      target_episode_numbers: [127], // wrong: season-indexed suggestion
      suggested_episode_numbers: [127],
      status: 'suggested',
    }]

    const result = setMappingTargets(rows, 'naruto-s06e01', '141')

    expect(result[0].target_episode_numbers).toEqual([141])
    expect(result[0].status).toBe('confirmed')
  })

  it('applyFansubGroupToEpisodeRows limits the patch to one canonical episode group', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'ep-100-a',
        target_episode_numbers: [100],
        suggested_episode_numbers: [100],
        status: 'confirmed',
        fansub_groups: [{ name: 'OldA' }],
      },
      {
        media_item_id: 'ep-100-b',
        target_episode_numbers: [100],
        suggested_episode_numbers: [100],
        status: 'confirmed',
        fansub_groups: [{ name: 'OldB' }],
      },
      {
        media_item_id: 'ep-101-a',
        target_episode_numbers: [101],
        suggested_episode_numbers: [101],
        status: 'confirmed',
        fansub_groups: [{ name: 'NextArc' }],
      },
    ]

    const result = applyFansubGroupToEpisodeRows(rows, 100, [
      { id: 4, name: 'AnimeOwnage', slug: 'anime-ownage' },
      { name: 'Co-Release' },
    ])

    expect(result[0].fansub_groups).toEqual([
      { id: 4, name: 'AnimeOwnage', slug: 'anime-ownage' },
      { name: 'Co-Release', slug: null },
    ])
    expect(result[1].fansub_groups).toEqual(result[0].fansub_groups)
    expect(result[2].fansub_groups).toEqual([{ name: 'NextArc' }])
  })

  it('applyFansubGroupToEpisodeRows keeps chip order stable while deduplicating repeated groups', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'ep-200-a',
        target_episode_numbers: [200],
        suggested_episode_numbers: [200],
        status: 'confirmed',
      },
    ]

    const result = applyFansubGroupToEpisodeRows(rows, 200, [
      { id: 9, name: 'First', slug: 'first' },
      { name: 'Second' },
      { id: 9, name: 'First', slug: 'first' },
      { name: 'second' },
    ])

    expect(result[0].fansub_groups).toEqual([
      { id: 9, name: 'First', slug: 'first' },
      { name: 'Second', slug: null },
    ])
  })

  it('applyFansubGroupFromEpisodeDown patches only the current episode and later groups', () => {
    const rows: EpisodeImportMappingRow[] = [
      {
        media_item_id: 'ep-099-a',
        target_episode_numbers: [99],
        suggested_episode_numbers: [99],
        status: 'confirmed',
        fansub_groups: [{ name: 'AnimeOwnage' }],
      },
      {
        media_item_id: 'ep-100-a',
        target_episode_numbers: [100],
        suggested_episode_numbers: [100],
        status: 'confirmed',
        fansub_groups: [{ name: 'AnimeOwnage' }],
      },
      {
        media_item_id: 'ep-101-a',
        target_episode_numbers: [101],
        suggested_episode_numbers: [101],
        status: 'confirmed',
        fansub_groups: [{ name: 'Broken' }],
      },
      {
        media_item_id: 'ep-102-a',
        target_episode_numbers: [102],
        suggested_episode_numbers: [102],
        status: 'confirmed',
        fansub_groups: [{ name: 'Broken' }],
      },
    ]

    const result = applyFansubGroupFromEpisodeDown(rows, 101, [
      { id: 7, name: 'NeoTokyoFansub', slug: 'neo-tokyo-fansub' },
      { name: 'LateNight' },
    ])

    expect(result[0].fansub_groups).toEqual([{ name: 'AnimeOwnage' }])
    expect(result[1].fansub_groups).toEqual([{ name: 'AnimeOwnage' }])
    expect(result[2].fansub_groups).toEqual([
      { id: 7, name: 'NeoTokyoFansub', slug: 'neo-tokyo-fansub' },
      { name: 'LateNight', slug: null },
    ])
    expect(result[3].fansub_groups).toEqual(result[2].fansub_groups)
  })

  it('buildEpisodeImportApplyInput keeps free-text chips after row edits', () => {
    const preview: EpisodeImportPreviewResult = {
      anime_id: 42,
      anime_title: 'Test Anime',
      canonical_episodes: [{ episode_number: 12 }],
      media_candidates: [{ media_item_id: 'episode-12', file_name: 'Episode 12.mkv', path: '/test/Episode 12.mkv' }],
      mappings: [],
    }

    const editedRows = setMappingTargets(
      [{
        media_item_id: 'episode-12',
        target_episode_numbers: [12],
        suggested_episode_numbers: [12],
        status: 'confirmed',
        fansub_groups: [{ name: 'Brand New Group' }, { id: 3, name: 'Known Group', slug: 'known-group' }],
        release_version: 'v3',
      }],
      'episode-12',
      '12,13',
    )

    const payload = buildEpisodeImportApplyInput(42, preview, editedRows)

    expect(payload.mappings[0].target_episode_numbers).toEqual([12, 13])
    expect(payload.mappings[0].fansub_groups).toEqual([
      { name: 'Brand New Group', slug: null },
      { id: 3, name: 'Known Group', slug: 'known-group' },
    ])
    expect(payload.mappings[0].release_version).toBe('v3')
  })

})
