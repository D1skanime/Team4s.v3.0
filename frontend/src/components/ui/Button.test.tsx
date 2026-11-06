// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('reicht aria-current/aria-pressed unverändert an das native Element durch', () => {
    render(<Button aria-current="page">Seite 2</Button>)
    expect(screen.getByRole('button').getAttribute('aria-current')).toBe('page')
  })

  it('reicht href durch und rendert dann einen Link statt eines Buttons', () => {
    render(<Button href="/ziel">Weiter</Button>)
    expect(screen.getByRole('link', { name: 'Weiter' })).not.toBeNull()
  })

  it('rendert mit href+as eine eigene Link-Komponente statt eines nativen <a>, für clientseitige Navigation', () => {
    function FakeLink({ href, children, ...rest }: { href: string; children: React.ReactNode }) {
      return <a data-testid="fake-link" href={href} {...rest}>{children}</a>
    }
    render(<Button href="/ziel" as={FakeLink}>Weiter</Button>)
    expect(screen.getByTestId('fake-link').getAttribute('href')).toBe('/ziel')
  })

  it('unterstützt size="hero"/"prose" und tone="accent"/"strong" (Basis für MetricList)', () => {
    const { container, rerender } = render(<Button variant="text" size="hero" tone="accent">42</Button>)
    expect(container.querySelector('button')?.className).toMatch(/buttonHero/)
    expect(container.querySelector('button')?.className).toMatch(/buttonToneAccent/)

    rerender(<Button variant="text" size="prose" tone="strong">42</Button>)
    expect(container.querySelector('button')?.className).toMatch(/buttonProse/)
    expect(container.querySelector('button')?.className).toMatch(/buttonToneStrong/)
  })

  it('stellt die globalen Merkliste-Zustände ohne lokale Klassen bereit', () => {
    const { container, rerender } = render(<Button variant="watchlist">Zur Merkliste</Button>)
    expect(container.querySelector('button')?.className).toMatch(/buttonWatchlist/)

    rerender(<Button variant="watchlistActive">In Merkliste</Button>)
    expect(container.querySelector('button')?.className).toMatch(/buttonWatchlistActive/)
  })

  it('stellt den Glas-Umschalt-Chip-Zustand über aria-pressed bereit (globale Form des bisherigen FansubGroupPicker-Chips)', () => {
    const { container, rerender } = render(<Button variant="chipGlass" size="sm">Alle</Button>)
    const button = container.querySelector('button')
    expect(button?.className).toMatch(/buttonChipGlass/)
    expect(button?.getAttribute('aria-pressed')).toBeNull()

    rerender(<Button variant="chipGlass" size="sm" aria-pressed="true">LazySubs</Button>)
    expect(container.querySelector('button')?.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('Button.module.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/Button.module.css'), 'utf8')

  it('bricht die Beschriftung nie um', () => {
    expect(css).toMatch(/white-space:\s*nowrap;/)
  })

  it('stellt den aktuell/ausgewählt-Zustand über aria-current/aria-pressed bereit, nicht über eine eigene Prop', () => {
    expect(css).toMatch(/\.button\[aria-current\]:not\(\[aria-current="false"\]\),\s*\n\.button\[aria-pressed="true"\]/)
  })

  it('deklariert die hero-/prose-Größen und accent-/strong-Töne NACH .buttonText, damit sie dessen eigenes inherit zuverlässig überschreiben', () => {
    const buttonTextIndex = css.indexOf('.buttonText {')
    expect(buttonTextIndex).toBeGreaterThan(-1)
    for (const selector of ['.buttonHero {', '.buttonProse {', '.buttonToneAccent {', '.buttonToneStrong {']) {
      const index = css.indexOf(selector)
      expect(index, `${selector} must exist in the stylesheet`).toBeGreaterThan(-1)
      expect(index, `${selector} must be declared after .buttonText to reliably win its inherit reset`).toBeGreaterThan(buttonTextIndex)
    }
  })

  it('deklariert .buttonChipGlass NACH .buttonSmall/.buttonLarge, damit seine Radius-/Schriftgröße-Formel zuverlässig gegen deren Größenwerte gewinnt', () => {
    const buttonSmallIndex = css.indexOf('.buttonSmall {')
    const buttonLargeIndex = css.indexOf('.buttonLarge {')
    const buttonChipGlassIndex = css.indexOf('.buttonChipGlass {')
    expect(buttonSmallIndex).toBeGreaterThan(-1)
    expect(buttonLargeIndex).toBeGreaterThan(-1)
    expect(buttonChipGlassIndex, '.buttonChipGlass must exist in the stylesheet').toBeGreaterThan(-1)
    expect(buttonChipGlassIndex, '.buttonChipGlass must be declared after .buttonSmall').toBeGreaterThan(buttonSmallIndex)
    expect(buttonChipGlassIndex, '.buttonChipGlass must be declared after .buttonLarge').toBeGreaterThan(buttonLargeIndex)
  })

  it('setzt für .buttonChipGlass einen eigenen --button-gap (4px statt der 10px-Standardlücke) für ein kleines Inline-Logo neben kurzer Chip-Beschriftung', () => {
    const chipGlassStart = css.indexOf('.buttonChipGlass {')
    expect(chipGlassStart, '.buttonChipGlass must exist in the stylesheet').toBeGreaterThan(-1)
    const chipGlassEnd = css.indexOf('}', chipGlassStart)
    const chipGlassBlock = css.slice(chipGlassStart, chipGlassEnd)
    expect(chipGlassBlock).toMatch(/--button-gap:\s*var\(--space-1\);/)
  })
})
