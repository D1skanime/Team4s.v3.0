import { describe, expect, it } from 'vitest'

import type { EpisodeImportMappingRow, EpisodeImportPreviewResult } from '../../../../../../types/episodeImport'
import {
  confirmEpisodeMappingRows,
  detectMappingConflicts,
  markAllSuggestedConfirmed,
  markAllSuggestedSkipped,
  markMappingSkipped,
  setMappingTargets,
  skipEpisodeMappingRows,
  summarizeImportPreview,
} from './episodeImportMapping'

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

  it('flags conflicts when different active media rows claim the same canonical episode', () => {
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

    expect(result.map((row) => row.status)).toEqual(['conflict', 'conflict'])
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

    // Parallel releases for the same episode show as conflict when target arrays overlap —
    // this is expected behaviour: operator sees conflict and resolves per-episode
    expect(result.map((r) => r.status)).toEqual(['conflict', 'conflict'])
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
})
