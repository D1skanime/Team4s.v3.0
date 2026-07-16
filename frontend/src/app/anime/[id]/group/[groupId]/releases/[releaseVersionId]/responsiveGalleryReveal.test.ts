// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  it.each(['mobile', 'tablet'] as const)('hydrates a desktop server snapshot before subscribing to %s', async target => {
    function Harness() {
      const { collapsedLimit } = useResponsiveGalleryReveal()
      return createElement('output', { 'data-limit': collapsedLimit }, String(collapsedLimit))
    }
    viewport = target
    const html = renderToString(createElement(Harness))
    expect(html).toContain('data-limit="6"')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => { root = hydrateRoot(container, createElement(Harness)) })
    await waitFor(() => expect(container.querySelector('output')?.getAttribute('data-limit')).toBe(target === 'mobile' ? '2' : '4'))
    expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/hydration|did not match/i)
    await act(async () => root.unmount())
    container.remove()
    consoleError.mockRestore()
  })
})
