import { describe, expect, it } from 'vitest'

import { shouldShowLoadingPill } from './MediaViewerStage'

describe('shouldShowLoadingPill', () => {
  it('zeigt den Pill, solange die Anzeige-URL von der Original-URL abweicht und das Original noch nicht geladen ist', () => {
    expect(shouldShowLoadingPill('display.jpg', 'original.jpg', false)).toBe(true)
  })

  it('blendet den Pill aus, sobald das Original geladen ist, unabhängig von den URL-Werten', () => {
    expect(shouldShowLoadingPill('display.jpg', 'original.jpg', true)).toBe(false)
    expect(shouldShowLoadingPill('same.jpg', 'same.jpg', true)).toBe(false)
  })

  it('zeigt den Pill nicht, wenn Anzeige- und Original-URL identisch sind (kein Swap ausstehend)', () => {
    expect(shouldShowLoadingPill('same.jpg', 'same.jpg', false)).toBe(false)
  })

  it('zeigt den Pill nicht, wenn keine Original-URL vorhanden ist', () => {
    expect(shouldShowLoadingPill('display.jpg', null, false)).toBe(false)
  })
})
