// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { QuickLinksSection, SEARCH_ROUTE_AVAILABLE } from './QuickLinksSection'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

afterEach(() => {
  cleanup()
})

describe('QuickLinksSection (Phase 116, D-06/Pitfall 3)', () => {
  it('rendert exakt 5 Kacheln in der festen Reihenfolge mit den korrekten Hrefs', () => {
    render(<QuickLinksSection searchRouteAvailable />)

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Anime entdecken',
      'Rangliste',
      'Fansub-Gruppen',
      'Suche',
      'Mein Profil',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/anime',
      '/members/ranking',
      '/fansubs',
      '/suche',
      '/me/profile',
    ])
  })

  it('SEARCH_ROUTE_AVAILABLE-Modulkonstante ist ein reiner Boolean-Literal (statische Pruefung, kein Fetch)', () => {
    expect(typeof SEARCH_ROUTE_AVAILABLE).toBe('boolean')
  })

  describe('wenn die Suche-Route verfuegbar ist (searchRouteAvailable=true)', () => {
    it('rendert die Suche-Kachel als echten anklickbaren Link', () => {
      render(<QuickLinksSection searchRouteAvailable />)

      const sucheLink = screen.getByRole('link', { name: 'Suche' })
      expect(sucheLink.getAttribute('href')).toBe('/suche')
      expect(screen.queryByText('bald')).toBeNull()
    })
  })

  describe('wenn die Suche-Route NICHT verfuegbar ist (searchRouteAvailable=false)', () => {
    it('rendert keinen Link auf /suche, sondern aria-disabled + Badge "bald"', () => {
      const { container } = render(<QuickLinksSection searchRouteAvailable={false} />)

      expect(container.querySelector('a[href="/suche"]')).toBeNull()
      expect(screen.getByText('bald')).not.toBeNull()

      const links = screen.getAllByRole('link')
      expect(links.map((link) => link.textContent)).not.toContain('Suche')
    })
  })

  it('gibt der ersten Kachel ("Anime entdecken") die Akzent-Klasse, keiner anderen', () => {
    const { container } = render(<QuickLinksSection searchRouteAvailable />)

    const accented = container.querySelectorAll('[class*="tileAccent"]')
    expect(accented).toHaveLength(1)
    expect(accented[0].textContent).toContain('Anime entdecken')
  })
})
