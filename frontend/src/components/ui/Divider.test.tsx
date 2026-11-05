// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Divider } from './Divider'

describe('Divider', () => {
  it('rendert ein <hr>-Element ohne zusätzliches role-Attribut', () => {
    const { container } = render(<Divider />)
    const hr = container.querySelector('hr')
    expect(hr).not.toBeNull()
    expect(hr?.getAttribute('aria-hidden')).toBe('true')
    expect(hr?.getAttribute('role')).toBeNull()
  })

  it('setzt im Standardfall weder die kräftige Ton-Klasse noch die Meta-Block-Abstandsklasse', () => {
    const { container } = render(<Divider />)
    const hr = container.querySelector('hr')
    expect(hr?.className).not.toMatch(/dividerOnMediaStrong/)
    expect(hr?.className).not.toMatch(/dividerWithinMetaBlock/)
  })

  it('wendet tone="onMediaStrong" als eigene Modifikator-Klasse an', () => {
    const { container } = render(<Divider tone="onMediaStrong" />)
    expect(container.querySelector('hr')?.className).toMatch(/dividerOnMediaStrong/)
  })

  it('wendet spacing="withinMetaBlock" als eigene Modifikator-Klasse an', () => {
    const { container } = render(<Divider spacing="withinMetaBlock" />)
    expect(container.querySelector('hr')?.className).toMatch(/dividerWithinMetaBlock/)
  })

  it('wendet spacing="none" als eigene Modifikator-Klasse an (kein eigener Außenabstand)', () => {
    const { container } = render(<Divider spacing="none" />)
    expect(container.querySelector('hr')?.className).toMatch(/dividerNoSpacing/)
  })

  it('erlaubt eine zusätzliche className für rein responsive Sichtbarkeit, ohne die eigenen Klassen zu verdrängen', () => {
    const { container } = render(<Divider className="mobileHidden" />)
    const hr = container.querySelector('hr')
    expect(hr?.className).toMatch(/_divider_/)
    expect(hr?.className).toMatch(/mobileHidden/)
  })
})

describe('Divider.module.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/Divider.module.css'), 'utf8')

  it('liest Ton und Abstand ausschließlich über bestehende, globale Tokens -- keine neuen Farb-/Längen-Literale', () => {
    const baseRule = css.match(/\.divider\s*\{([^}]+)\}/)?.[1]
    expect(baseRule, '.divider muss existieren').toBeTruthy()
    expect(baseRule).toMatch(/background:\s*var\(--border-on-media\);/)
    expect(baseRule).toMatch(/margin:\s*var\(--space-5\)\s*0;/)
    expect(baseRule).toMatch(/height:\s*var\(--border-width-thin\);/)
    expect(baseRule).toMatch(/border:\s*none;/)
  })

  it('.dividerOnMediaStrong überschreibt ausschließlich die Hintergrundfarbe auf den kräftigeren Token', () => {
    const rule = css.match(/\.dividerOnMediaStrong\s*\{([^}]+)\}/)?.[1]
    expect(rule, '.dividerOnMediaStrong muss existieren').toBeTruthy()
    expect(rule).toMatch(/background:\s*var\(--border-on-media-strong\);/)
    expect(rule).not.toMatch(/margin/)
  })

  it('.dividerWithinMetaBlock überschreibt ausschließlich den Außenabstand auf die knappere Stufe', () => {
    const rule = css.match(/\.dividerWithinMetaBlock\s*\{([^}]+)\}/)?.[1]
    expect(rule, '.dividerWithinMetaBlock muss existieren').toBeTruthy()
    expect(rule).toMatch(/margin:\s*var\(--space-1\)\s*0;/)
    expect(rule).not.toMatch(/background/)
  })

  it('.dividerNoSpacing setzt den Außenabstand auf den Literalwert 0 (kein Zweck-Token)', () => {
    const rule = css.match(/\.dividerNoSpacing\s*\{([^}]+)\}/)?.[1]
    expect(rule, '.dividerNoSpacing muss existieren').toBeTruthy()
    expect(rule).toMatch(/margin:\s*0;/)
    expect(rule).not.toMatch(/background/)
  })
})
