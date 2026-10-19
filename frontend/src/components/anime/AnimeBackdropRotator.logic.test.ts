import { describe, expect, it } from 'vitest'

import {
  canSwapInPreloadedBackdrop,
  getNextBackdropIndex,
  resolveBackdropSlotsAfterPreload,
} from './AnimeBackdropRotator.logic'

describe('getNextBackdropIndex', () => {
  it('advances to the next index within bounds', () => {
    expect(getNextBackdropIndex(0, 3)).toBe(1)
  })

  it('wraps around from the last index back to 0', () => {
    expect(getNextBackdropIndex(2, 3)).toBe(0)
  })

  it('returns 0 for totalCount 0 (guard, no NaN/Infinity)', () => {
    expect(getNextBackdropIndex(0, 0)).toBe(0)
  })

  it('returns 0 for a negative totalCount (guard, no NaN/Infinity)', () => {
    expect(getNextBackdropIndex(5, -1)).toBe(0)
  })

  it('always returns 0 for totalCount 1', () => {
    expect(getNextBackdropIndex(0, 1)).toBe(0)
  })
})

describe('canSwapInPreloadedBackdrop', () => {
  it('returns true when preload succeeded', () => {
    expect(canSwapInPreloadedBackdrop(true)).toBe(true)
  })

  it('returns false when preload failed', () => {
    expect(canSwapInPreloadedBackdrop(false)).toBe(false)
  })
})

describe('resolveBackdropSlotsAfterPreload', () => {
  it('returns currentSlots/visibleSlotIndex unchanged when preload failed', () => {
    const currentSlots: [string, string] = ['a.jpg', 'b.jpg']
    const result = resolveBackdropSlotsAfterPreload({
      preloadSucceeded: false,
      currentSlots,
      visibleSlotIndex: 0,
      nextUrl: 'c.jpg',
    })

    expect(result).toEqual({ slots: currentSlots, visibleSlotIndex: 0 })
  })

  it('writes nextUrl into the hidden slot 1 and flips visibility when visibleSlotIndex is 0', () => {
    const result = resolveBackdropSlotsAfterPreload({
      preloadSucceeded: true,
      currentSlots: ['a.jpg', 'b.jpg'],
      visibleSlotIndex: 0,
      nextUrl: 'c.jpg',
    })

    expect(result).toEqual({ slots: ['a.jpg', 'c.jpg'], visibleSlotIndex: 1 })
  })

  it('writes nextUrl into the hidden slot 0 and flips visibility when visibleSlotIndex is 1', () => {
    const result = resolveBackdropSlotsAfterPreload({
      preloadSucceeded: true,
      currentSlots: ['a.jpg', 'b.jpg'],
      visibleSlotIndex: 1,
      nextUrl: 'c.jpg',
    })

    expect(result).toEqual({ slots: ['c.jpg', 'b.jpg'], visibleSlotIndex: 0 })
  })

  it('behaves identically when nextUrl matches an already present slot value', () => {
    const result = resolveBackdropSlotsAfterPreload({
      preloadSucceeded: true,
      currentSlots: ['a.jpg', 'b.jpg'],
      visibleSlotIndex: 0,
      nextUrl: 'a.jpg',
    })

    expect(result).toEqual({ slots: ['a.jpg', 'a.jpg'], visibleSlotIndex: 1 })
  })
})
