// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import type { FansubGroupMediaItem } from '@/lib/api'

import {
  GROUP_MEDIA_REORDER_MIME_TYPE,
  computeReorderedMediaItems,
  isInteractiveDragTarget,
  isReorderDrag,
  resolveSourceMediaId,
} from './useGroupMediaReviewReorder.helpers'

function buildItem(id: number, sortOrder: number): FansubGroupMediaItem {
  return {
    id,
    sort_order: sortOrder,
  } as FansubGroupMediaItem
}

describe('isReorderDrag', () => {
  it('accepts a dragover carrying the own MIME type while reordering is allowed', () => {
    expect(isReorderDrag(['text/plain', GROUP_MEDIA_REORDER_MIME_TYPE], true)).toBe(true)
  })

  it('rejects when reordering is currently disallowed (filtered view), even with the own MIME type present', () => {
    expect(isReorderDrag(['text/plain', GROUP_MEDIA_REORDER_MIME_TYPE], false)).toBe(false)
  })

  it('rejects a drag that does not carry the own MIME type (e.g. a stray file drag)', () => {
    expect(isReorderDrag(['text/plain', 'Files'], true)).toBe(false)
  })
})

describe('resolveSourceMediaId', () => {
  it('reads the source id from dataTransfer when present', () => {
    const dataTransfer = { getData: (type: string) => (type === GROUP_MEDIA_REORDER_MIME_TYPE ? '42' : '') }
    expect(resolveSourceMediaId(dataTransfer, null)).toBe(42)
  })

  it('falls back to the ref value when dataTransfer has no payload', () => {
    const dataTransfer = { getData: () => '' }
    expect(resolveSourceMediaId(dataTransfer, 7)).toBe(7)
  })

  it('falls back to the ref value when the dataTransfer payload is malformed', () => {
    const dataTransfer = { getData: () => 'not-a-number' }
    expect(resolveSourceMediaId(dataTransfer, 7)).toBe(7)
  })
})

describe('isInteractiveDragTarget', () => {
  it('detects a button as an interactive target', () => {
    const button = document.createElement('button')
    expect(isInteractiveDragTarget(button)).toBe(true)
  })

  it('detects an element nested inside an input as interactive', () => {
    const label = document.createElement('label')
    const input = document.createElement('input')
    label.appendChild(input)
    expect(isInteractiveDragTarget(input)).toBe(true)
  })

  it('does not treat a plain card surface as interactive', () => {
    const section = document.createElement('section')
    const image = document.createElement('img')
    section.appendChild(image)
    expect(isInteractiveDragTarget(image)).toBe(false)
  })

  it('returns false for a null target', () => {
    expect(isInteractiveDragTarget(null)).toBe(false)
  })
})

describe('computeReorderedMediaItems', () => {
  const items = [buildItem(1, 10), buildItem(2, 20), buildItem(3, 30), buildItem(4, 40)]

  it('returns null for a no-op drop onto the source item itself', () => {
    expect(computeReorderedMediaItems(items, 2, 2, 10)).toBeNull()
  })

  it('returns null when the source id is not found', () => {
    expect(computeReorderedMediaItems(items, 999, 2, 10)).toBeNull()
  })

  it('returns null when the target id is not found', () => {
    expect(computeReorderedMediaItems(items, 2, 999, 10)).toBeNull()
  })

  it('moves the source item to the target position and renumbers sort_order sequentially', () => {
    const result = computeReorderedMediaItems(items, 1, 3, 10)
    expect(result?.map((item) => item.id)).toEqual([2, 3, 1, 4])
    expect(result?.map((item) => item.sort_order)).toEqual([10, 20, 30, 40])
  })

  it('moving the last item to the front reorders the rest accordingly', () => {
    const result = computeReorderedMediaItems(items, 4, 1, 5)
    expect(result?.map((item) => item.id)).toEqual([4, 1, 2, 3])
    expect(result?.map((item) => item.sort_order)).toEqual([5, 10, 15, 20])
  })
})
