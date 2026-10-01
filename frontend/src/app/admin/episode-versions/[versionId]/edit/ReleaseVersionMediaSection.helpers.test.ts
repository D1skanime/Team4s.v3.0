import { describe, expect, it } from 'vitest'

import { moveStoryItem } from './ReleaseVersionMediaSection.helpers'

describe('moveStoryItem', () => {
  const items = [
    { type: 'media' as const, media: { id: 1 } as never, sort_order: 10 },
    { type: 'media' as const, media: { id: 2 } as never, sort_order: 20 },
    { type: 'media' as const, media: { id: 3 } as never, sort_order: 30 },
  ]

  it('moves an item to every requested position without an off-by-one', () => {
    expect(moveStoryItem(items, 0, 1).map((item) => item.type === 'media' ? item.media.id : -1)).toEqual([2, 1, 3])
    expect(moveStoryItem(items, 0, 2).map((item) => item.type === 'media' ? item.media.id : -1)).toEqual([2, 3, 1])
    expect(moveStoryItem(items, 2, 0).map((item) => item.type === 'media' ? item.media.id : -1)).toEqual([3, 1, 2])
  })
})
