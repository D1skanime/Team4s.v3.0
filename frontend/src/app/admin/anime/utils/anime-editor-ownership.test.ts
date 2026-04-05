import { describe, expect, it } from 'vitest'

import { resolveAnimeEditorOwnership } from './anime-editor-ownership'

describe('resolveAnimeEditorOwnership', () => {
  it('labels records without external linkage as manual', () => {
    expect(resolveAnimeEditorOwnership({ id: 1, title: 'Manual Anime' })).toMatchObject({
      label: 'Manuell gepflegt',
      tone: 'manual',
      hint: 'Keine persistierte Jellyfin-Verknuepfung aktiv. Aenderungen bleiben manuell gepflegt.',
    })
  })

  it('labels jellyfin-linked records as externally linked', () => {
    expect(
      resolveAnimeEditorOwnership({
        id: 2,
        title: 'Linked Anime',
        source: 'jellyfin',
        jellyfinSeriesID: 'series-42',
      }),
    ).toMatchObject({
      label: 'Jellyfin-Provenance aktiv',
      tone: 'linked',
    })
  })

  it('surfaces the persisted Jellyfin path in the operator hint when available', () => {
    expect(
      resolveAnimeEditorOwnership({
        id: 3,
        title: 'Linked Anime',
        jellyfin_series_path: '/library/anime/Serial Experiments Lain',
      }).hint,
    ).toContain('/library/anime/Serial Experiments Lain')
  })
})
