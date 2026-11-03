import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  emptyGroupedEpisodesResponse,
  manyGroupedEpisodesResponse,
  moreGroupedEpisodesResponse,
  freezingGroupedEpisodesResponse,
} from './AnimeDetailView.fixtures'

describe('AnimeDetailView Storybook-Fixtures', () => {
  it('verweist nicht mehr auf den nicht dekodierbaren /covers/placeholder.jpg (Commit 159-05)', () => {
    for (const file of ['AnimeDetailView.fixtures.ts', 'AnimeDetailView.stories.tsx', 'AnimeDetailHero.stories.tsx']) {
      const source = fs.readFileSync(path.resolve(process.cwd(), 'src/app/anime/[id]', file), 'utf8')
      expect(source, `${file} darf /covers/placeholder.jpg nicht mehr referenzieren`).not.toMatch(/placeholder\.jpg/)
    }
  })

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

  it('hält die Freezing-Mehrgruppenfassung bei zwölf Episoden konsistent', () => {
    expect(freezingGroupedEpisodesResponse.data.episode_count).toBe(12)
    expect(freezingGroupedEpisodesResponse.data.episodes).toHaveLength(12)
    expect(freezingGroupedEpisodesResponse.data.episodes.every((episode) => episode.versions[0]?.fansub_groups?.length === 3)).toBe(true)
  })
})
