// @vitest-environment jsdom
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
