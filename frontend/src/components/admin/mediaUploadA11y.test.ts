import { describe, expect, it } from 'vitest'

import { getCropOffsetDeltaForKey, getFocusTrapNextIndex } from './mediaUploadA11y'

describe('getCropOffsetDeltaForKey', () => {
  it('returns fine step deltas for arrow keys', () => {
    expect(getCropOffsetDeltaForKey('ArrowLeft', false)).toEqual({ x: -6, y: 0 })
    expect(getCropOffsetDeltaForKey('ArrowRight', false)).toEqual({ x: 6, y: 0 })
    expect(getCropOffsetDeltaForKey('ArrowUp', false)).toEqual({ x: 0, y: -6 })
    expect(getCropOffsetDeltaForKey('ArrowDown', false)).toEqual({ x: 0, y: 6 })
  })

  it('returns coarse step deltas when shift is held', () => {
    expect(getCropOffsetDeltaForKey('ArrowLeft', true)).toEqual({ x: -16, y: 0 })
    expect(getCropOffsetDeltaForKey('ArrowDown', true)).toEqual({ x: 0, y: 16 })
  })

  it('returns null for non-arrow keys', () => {
    expect(getCropOffsetDeltaForKey('Enter', false)).toBeNull()
    expect(getCropOffsetDeltaForKey('Tab', true)).toBeNull()
  })
})

describe('getFocusTrapNextIndex', () => {
  it('moves forward and wraps at the end', () => {
    expect(getFocusTrapNextIndex(0, 4, false)).toBe(1)
    expect(getFocusTrapNextIndex(3, 4, false)).toBe(0)
  })

  it('moves backward and wraps at the start', () => {
    expect(getFocusTrapNextIndex(2, 4, true)).toBe(1)
    expect(getFocusTrapNextIndex(0, 4, true)).toBe(3)
  })

  it('handles unknown current focus safely', () => {
    expect(getFocusTrapNextIndex(-1, 4, false)).toBe(0)
    expect(getFocusTrapNextIndex(-1, 4, true)).toBe(3)
  })

  it('returns -1 for empty focusable lists', () => {
    expect(getFocusTrapNextIndex(0, 0, false)).toBe(-1)
  })
})
