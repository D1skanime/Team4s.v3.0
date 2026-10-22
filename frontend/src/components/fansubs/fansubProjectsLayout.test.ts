import { describe, expect, it } from 'vitest'

import { decideProjectsLayout, resolveBreakpoint } from './fansubProjectsLayout'

describe('resolveBreakpoint', () => {
  it.each([
    [0, 'mobile'],
    [639, 'mobile'],
    [640, 'tablet'],
    [999, 'tablet'],
    [1000, 'desktop'],
    [1920, 'desktop'],
  ] as const)('resolveBreakpoint(%d) -> %s', (width, expected) => {
    expect(resolveBreakpoint(width)).toBe(expected)
  })
})

describe('decideProjectsLayout', () => {
  it.each([
    [1, 'mobile', { mode: 'grid', columns: 1 }],
    [1, 'tablet', { mode: 'grid', columns: 2 }],
    [1, 'desktop', { mode: 'grid', columns: 3 }],
    [2, 'mobile', { mode: 'carousel-peek', columns: 1 }],
    [2, 'tablet', { mode: 'grid', columns: 2 }],
    [3, 'tablet', { mode: 'scroll-strip', columns: 2 }],
    [3, 'desktop', { mode: 'grid', columns: 3 }],
    [4, 'desktop', { mode: 'scroll-strip', columns: 3 }],
    [0, 'desktop', { mode: 'grid', columns: 3 }],
  ] as const)(
    'decideProjectsLayout(%d, %s) -> %o',
    (projectCount, breakpoint, expected) => {
      expect(decideProjectsLayout(projectCount, breakpoint)).toEqual(expected)
    },
  )
})
