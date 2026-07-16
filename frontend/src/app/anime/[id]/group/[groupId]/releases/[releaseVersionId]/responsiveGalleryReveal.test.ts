// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { galleryLimitForMatches, useResponsiveGalleryReveal } from './responsiveGalleryReveal'

let viewport: 'desktop' | 'tablet' | 'mobile'
const listeners = new Set<() => void>()

function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({
    get matches() { return query.includes('600') ? viewport === 'mobile' : viewport !== 'desktop' },
    media: query,
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  }) })
}

function resize(next: typeof viewport) {
  viewport = next
  act(() => listeners.forEach(listener => listener()))
}

describe('responsiveGalleryReveal', () => {
  beforeEach(() => { viewport = 'desktop'; listeners.clear(); installMatchMedia() })

  it('maps desktop, tablet, and mobile to one 6/4/2 source', () => {
    expect(galleryLimitForMatches(false, false)).toBe(6)
    expect(galleryLimitForMatches(false, true)).toBe(4)
    expect(galleryLimitForMatches(true, true)).toBe(2)
  })

  it('updates collapsed limits on resize and never recollapses expanded state', () => {
    const { result } = renderHook(() => useResponsiveGalleryReveal())
    expect(result.current.collapsedLimit).toBe(6)
    resize('tablet'); expect(result.current.collapsedLimit).toBe(4)
    resize('mobile'); expect(result.current.collapsedLimit).toBe(2)
    act(() => result.current.expand())
    expect(result.current.expanded).toBe(true)
    resize('desktop')
    expect(result.current.expanded).toBe(true)
    expect(result.current.collapsedLimit).toBe(6)
  })
})
