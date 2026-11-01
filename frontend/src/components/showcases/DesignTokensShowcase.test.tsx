// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DesignTokensShowcase } from './DesignTokensShowcase'

/** Lädt die echte globals.css als Stylesheet ins Test-DOM -- dieselbe Quelle, die Storybooks
 *  `preview.tsx` auch in der echten Seite einbindet (siehe `.storybook/preview.tsx`). Die
 *  Komponente liest ihre Tokens über `document.styleSheets`, nicht über einen Test-Mock. */
function loadGlobalsCssIntoDocument() {
  const css = readFileSync('src/styles/globals.css', 'utf8')
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  return () => document.head.removeChild(style)
}

describe('DesignTokensShowcase', () => {
  it('zeigt jedes einzelne in globals.css deklarierte Token -- Vollständigkeitsnachweis gegen eine unabhängige Regex-Zählung derselben Datei', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      const { container } = render(<DesignTokensShowcase />)

      const css = readFileSync('src/styles/globals.css', 'utf8')
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

  it('gruppiert sichtbar nach Namens-Familie (z. B. eine eigene Kennzahlen-Kachel für "Abstände")', () => {
    const cleanup = loadGlobalsCssIntoDocument()
    try {
      render(<DesignTokensShowcase />)
      expect(screen.queryByText('Abstände')).not.toBeNull()
      expect(screen.getByText('--space-1')).not.toBeNull()
    } finally {
      cleanup()
    }
  })

  it('stürzt ohne geladenes :root-Stylesheet nicht ab, sondern zeigt null gefundene Tokens', () => {
    const { container } = render(<DesignTokensShowcase />)
    expect(container.querySelector('[data-token-count]')?.getAttribute('data-token-count')).toBe('0')
  })
})
