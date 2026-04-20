import { describe, expect, it } from 'vitest'

import type { EpisodeImportMappingRow, EpisodeImportPreviewResult } from '../../../../../../types/episodeImport'
import {
  detectMappingConflicts,
  markMappingSkipped,
  setMappingTargets,
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
})
