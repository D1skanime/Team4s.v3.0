import { describe, expect, it } from 'vitest'

import {
  emptyGroupedEpisodesResponse,
  manyGroupedEpisodesResponse,
  moreGroupedEpisodesResponse,
} from './AnimeDetailView.fixtures'

describe('AnimeDetailView Storybook-Fixtures', () => {
  it('bildet einen erfolgreichen Leerzustand ohne Episoden ab', () => {
    expect(emptyGroupedEpisodesResponse.data.episodes).toEqual([])
    expect(emptyGroupedEpisodesResponse.data.episode_count).toBe(0)
    expect(emptyGroupedEpisodesResponse.data.pagination).toEqual({ has_more: false, next_cursor: null, row_limit: 24 })
  })

  it('liefert eine erste und eine weitere Cursor-Seite für das Nachladen', () => {
    expect(manyGroupedEpisodesResponse.data.episodes).toHaveLength(24)
    expect(manyGroupedEpisodesResponse.data.pagination).toEqual({ has_more: true, next_cursor: 'episode-page-2', row_limit: 24 })
    expect(moreGroupedEpisodesResponse.data.episodes).toHaveLength(24)
    expect(moreGroupedEpisodesResponse.data.pagination).toEqual({ has_more: false, next_cursor: null, row_limit: 24 })
  })
})
