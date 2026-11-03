// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { AdjacentNavigation } from './AdjacentNavigation'

describe('AdjacentNavigation', () => {
  it('rendert vorherigen und nächsten Link mit eindeutigen Labels', () => {
    render(
      <AdjacentNavigation
        ariaLabel="Projekt-Navigation"
        previous={{ href: '/projekte/a', label: 'Tristia of the Deep Blue Sea' }}
        next={{ href: '/projekte/b', label: 'Viper Creed', ariaLabel: 'Nächstes Projekt' }}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Projekt-Navigation' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Vorheriger Inhalt: Tristia/i }).getAttribute('href')).toBe('/projekte/a')
    expect(screen.getByRole('link', { name: 'Nächstes Projekt' }).getAttribute('href')).toBe('/projekte/b')
  })

  it('rendert nichts, wenn kein benachbarter Inhalt vorhanden ist', () => {
    const { container } = render(<AdjacentNavigation />)

    expect(container.firstChild).toBeNull()
  })

  it('unterstützt die Floating-Variante für Hero-Flächen', () => {
    render(
      <AdjacentNavigation
        variant="floating"
        previous={{ href: '/projekte/a', label: 'Vorheriges Projekt' }}
      />,
    )

    expect(screen.getByRole('navigation').className).toMatch(/adjacentNavFloating/)
  })
})

describe('AdjacentNavigation.module.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/AdjacentNavigation.module.css'), 'utf8')

  it('spannt die floating-Variante ohne horizontalen Innenabstand über die volle Breite auf (inset:0 0), die Randständigkeit übernimmt translateX', () => {
    const floatingRule = css.match(/\.adjacentNavFloating\s*\{([^}]+)\}/)?.[1]
    expect(floatingRule, '.adjacentNavFloating must exist').toBeTruthy()
    expect(floatingRule).toMatch(/inset:\s*0 0 auto;/)
  })

  it('verschiebt Previous/Next der floating-Variante um die halbe eigene Breite auf die Kartenkante (main-Optik: halb innen, halb außen)', () => {
    expect(css).toMatch(/\.adjacentNavFloating \.adjacentNavPrevious\s*\{\s*transform:\s*translateX\(-50%\);\s*\}/)
    expect(css).toMatch(/\.adjacentNavFloating \.adjacentNavNext\s*\{\s*transform:\s*translateX\(50%\);\s*\}/)
  })

  it('setzt die Randständigkeit unterhalb 767px zurück (main: Buttons fließen normal im Grid am unteren Kartenrand)', () => {
    const mobileBlock = css.slice(css.indexOf('@media (max-width: 767px)'))
    expect(mobileBlock).toMatch(/\.adjacentNavFloating \.adjacentNavPrevious,\s*\n\s*\.adjacentNavFloating \.adjacentNavNext\s*\{\s*transform:\s*none;\s*\}/)
  })
})
