import { describe, expect, it } from 'vitest'

import { hydrateManualDraftFromAniSearchDraft, resolveManualCreateState } from './useManualAnimeDraft'

describe('resolveManualCreateState', () => {
  it('returns empty when there is no meaningful manual input', () => {
    expect(resolveManualCreateState({})).toMatchObject({ key: 'empty', canSubmit: false })
    expect(resolveManualCreateState({ title: '   ', cover_image: '   ' })).toMatchObject({
      key: 'empty',
      canSubmit: false,
    })
  })

  it('returns incomplete when there is some input but title and cover are not both present', () => {
    expect(resolveManualCreateState({ title: 'Serial Experiments Lain' })).toMatchObject({
      key: 'incomplete',
      canSubmit: false,
    })
    expect(resolveManualCreateState({ cover_image: '/covers/lain.jpg' })).toMatchObject({
      key: 'incomplete',
      canSubmit: false,
    })
  })

  it('returns ready when both title and cover are present', () => {
    expect(
      resolveManualCreateState({
        title: 'Serial Experiments Lain',
        cover_image: '/covers/lain.jpg',
      }),
    ).toMatchObject({ key: 'ready', canSubmit: true })
  })

  it('replaces provisional lookup text when AniSearch data is loaded', () => {
    const hydrated = hydrateManualDraftFromAniSearchDraft(
      {
        title: 'lain sea',
        type: 'tv',
        contentType: 'anime',
        status: 'ongoing',
        year: '',
        maxEpisodes: '',
        titleDE: '',
        titleEN: '',
        genreTokens: [],
        tagTokens: [],
        description: '',
        coverImage: '',
      },
      {
        title: 'Serial Experiments Lain',
        type: 'tv',
        content_type: 'anime',
        status: 'ongoing',
        source: 'anisearch:12345',
      },
    )

    expect(hydrated.title).toBe('Serial Experiments Lain')
  })
})
