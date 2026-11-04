// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { readGlobalsCssResolved } from '@/test/readGlobalsCss'

import { DesignTokensShowcase } from './DesignTokensShowcase'

/** Lädt die echte globals.css (mit aufgelöster @import-Kette) als Stylesheet ins Test-DOM --
 *  dieselbe effektive Token-Menge, die Webpack/Storybooks `preview.tsx` auch in der echten Seite
 *  einbindet (siehe `.storybook/preview.tsx`): der Bundler löst `@import` beim Build genauso auf,
 *  jsdom kann relative `@import`-URLs in einem per `textContent` gesetzten `<style>`-Tag dagegen
 *  nicht selbst nachladen. Die Komponente liest ihre Tokens über `document.styleSheets`, nicht
 *  über einen Test-Mock. */
function loadGlobalsCssIntoDocument() {
  const css = readGlobalsCssResolved()
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  return () => document.head.removeChild(style)
}

describe('DesignTokensShowcase', () => {
  it('zeigt jedes einzelne in globals.css deklarierte Token irgendwo auf der Seite -- Vollständigkeitsnachweis gegen eine unabhängige Regex-Zählung derselben Datei, über alle drei Stufen hinweg', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      const { container } = render(<DesignTokensShowcase />)

      const css = readGlobalsCssResolved()
      const rootBlocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => match[1])
      const independentNames = new Set<string>()
      for (const block of rootBlocks) {
        for (const match of block.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
          independentNames.add(match[1])
        }
      }

      const renderedCount = Number(container.querySelector('[data-token-count]')!.getAttribute('data-token-count'))
      expect(renderedCount).toBe(independentNames.size)

      const renderedNames = [...container.querySelectorAll('code')]
        .map((node) => node.textContent ?? '')
        .filter((text) => text.startsWith('--'))
      expect(new Set(renderedNames)).toEqual(independentNames)
    } finally {
      cleanup()
    }
  })

  it('zeigt die drei Gliederungs-Stufen in der vorgeschriebenen Reihenfolge: Grundskala, Zweck-Werte, Bausteinwerte', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      render(<DesignTokensShowcase />)
      const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
      const foundationIndex = headings.indexOf('Grundskala')
      const purposeIndex = headings.indexOf('Zweck-Werte')
      const componentIndex = headings.indexOf('Bausteinwerte')
      expect(foundationIndex).toBeGreaterThanOrEqual(0)
      expect(purposeIndex).toBeGreaterThan(foundationIndex)
      expect(componentIndex).toBeGreaterThan(purposeIndex)
    } finally {
      cleanup()
    }
  })

  it('zeigt die Grundskala mit einer echten Vorschau je Wert -- z. B. eine Farbfläche für --color-primary', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      const { container } = render(<DesignTokensShowcase />)
      expect(screen.getByText('--color-primary')).not.toBeNull()
      expect(screen.getByText('--space-3')).not.toBeNull()
      expect(screen.getByText('--radius-sm')).not.toBeNull()
      // mindestens eine Vorschau-Fläche wurde tatsächlich auf den jeweiligen Token verdrahtet
      const previews = container.querySelectorAll('[style*="var(--color-primary)"]')
      expect(previews.length).toBeGreaterThan(0)
    } finally {
      cleanup()
    }
  })

  it('zeigt Zweck-Werte mit einem Rückverweis auf ihren Grundwert (z. B. --space-section -> --space-3)', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      render(<DesignTokensShowcase />)
      expect(screen.getByText('--space-section')).not.toBeNull()
      expect(screen.getByText('--radius-surface')).not.toBeNull()
      expect(screen.getAllByText(/--space-3/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('-> 12px (--space-3)').length).toBeGreaterThan(0)
    } finally {
      cleanup()
    }
  })

  it('gruppiert Bausteinwerte nach Baustein (z. B. "Card"), zeigt die Gruppe standardmäßig eingeklappt (per hidden-Attribut, nicht aus dem DOM entfernt) und markiert mindestens einen fest codierten Wert', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      const { container } = render(<DesignTokensShowcase />)
      const cardHeaderButton = screen.getByText(/^Card \(\d+\)$/).closest('button')
      expect(cardHeaderButton).not.toBeNull()
      expect(cardHeaderButton?.getAttribute('aria-expanded')).toBe('false')

      const panelId = cardHeaderButton?.getAttribute('aria-controls')
      const panel = panelId ? container.querySelector(`[id="${panelId}"]`) : null
      expect(panel).not.toBeNull()
      expect(panel?.hasAttribute('hidden')).toBe(true)
      // trotz Einklapp-Zustand bleibt der Token selbst im DOM (Vollständigkeitsnachweis), nur
      // visuell verborgen -- siehe `keepMountedIds` in DesignTokensShowcase.tsx.
      expect(panel?.textContent).toContain('--card-gap')

      expect(screen.getAllByText('Fest codiert, noch kein Zweck-Token').length).toBeGreaterThan(0)
    } finally {
      cleanup()
    }
  })

  it('verwendet an keiner Stelle die Begriffe "CSS-Custom-Properties" oder "domänenspezifische Komposition"', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      const { container } = render(<DesignTokensShowcase />)
      expect(container.textContent).not.toMatch(/CSS-Custom-Properties|domänenspezifische Komposition/)
    } finally {
      cleanup()
    }
  })

  it('stürzt ohne geladenes :root-Stylesheet nicht ab, sondern zeigt null gefundene Tokens', () => {
    const { container } = render(<DesignTokensShowcase />)
    expect(container.querySelector('[data-token-count]')?.getAttribute('data-token-count')).toBe('0')
  })
})
