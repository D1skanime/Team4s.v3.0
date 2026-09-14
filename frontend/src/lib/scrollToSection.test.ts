// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { scrollToSection } from './scrollToSection'

if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn()
}

// jsdom implementiert window.matchMedia nicht -- reiner Test-Infra-Stub, keine
// Produktionsverhaltensaenderung. Individual tests override via vi.stubGlobal when they need to
// assert on the prefers-reduced-motion branch specifically.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as typeof window.matchMedia
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('scrollToSection', () => {
  it('scrolls an existing element via scrollIntoView with a smooth behavior', () => {
    document.body.innerHTML = '<div id="texte"></div>'
    const el = document.getElementById('texte')!
    const spy = vi.spyOn(el, 'scrollIntoView')

    scrollToSection('texte')

    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('no-ops without throwing when the id does not exist in the DOM', () => {
    expect(() => scrollToSection('does-not-exist')).not.toThrow()
  })

  it('uses behavior: "auto" when prefers-reduced-motion is set', () => {
    document.body.innerHTML = '<div id="bilder"></div>'
    const el = document.getElementById('bilder')!
    const spy = vi.spyOn(el, 'scrollIntoView')

    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    scrollToSection('bilder')

    expect(spy).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })
})
