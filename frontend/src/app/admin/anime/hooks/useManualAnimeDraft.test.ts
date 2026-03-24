import { describe, expect, it } from 'vitest'

import { resolveManualCreateState } from './useManualAnimeDraft'

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
})
