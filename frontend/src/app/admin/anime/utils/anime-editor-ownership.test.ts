import { describe, expect, it } from 'vitest'

import { resolveAnimeEditorOwnership } from './anime-editor-ownership'

describe('resolveAnimeEditorOwnership', () => {
  it('labels records without external linkage as manual', () => {
    expect(resolveAnimeEditorOwnership({ id: 1, title: 'Manual Anime' })).toMatchObject({
      label: 'Manuell gepflegt',
      tone: 'manual',
      hint: 'Aenderungen werden deinem Admin-Konto zugeordnet.',
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
      label: 'Mit externer Quelle verknuepft',
      tone: 'linked',
    })
  })
})
