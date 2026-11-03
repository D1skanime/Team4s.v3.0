// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from './Card'

describe('Card', () => {
  it('wendet die publicHeroInfo-Klasse ohne lokale Farbklassen an', () => {
    const { container } = render(<Card variant="publicHeroInfo">Inhalt</Card>)
    expect(container.querySelector('section')?.className).toMatch(/cardPublicHeroInfo/)
  })
})

describe('Card.module.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/Card.module.css'), 'utf8')

  it('setzt Heading/Texts eigene Override-Hooks innerhalb von .cardPublicHeroInfo unterhalb 767px, statt eine Seite Farben setzen zu lassen', () => {
    const mobileBlockStart = css.indexOf('@media (max-width: 767px)')
    expect(mobileBlockStart).toBeGreaterThan(-1)
    const mobileRule = css.slice(mobileBlockStart).match(/\.cardPublicHeroInfo\s*\{([^}]+)\}/)?.[1]
    expect(mobileRule, '.cardPublicHeroInfo must have a mobile override').toBeTruthy()
    // Heading (tone="default"), Text (variant="body") und die "Tags"-Beschriftung (Text,
    // variant="eyebrow") lesen ihre Standardfarbe über genau diese drei offiziellen
    // Override-Hooks -- das Setzen hier lässt Titel/Beschreibung/"Tags" der Anime-Info-Karte
    // automatisch mit der Karte auf die helle Scrim-Tonalität kippen, ohne dass irgendeine Seite
    // selbst eine Farbentscheidung trifft.
    expect(mobileRule).toMatch(/--heading-color:\s*var\(--scrim-text\);/)
    expect(mobileRule).toMatch(/--text-body-color:\s*var\(--scrim-icon\);/)
    expect(mobileRule).toMatch(/--text-eyebrow-color:\s*var\(--scrim-icon\);/)
  })
})
