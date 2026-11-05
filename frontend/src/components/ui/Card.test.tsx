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

  it('setzt --card-padding-override nur, wenn die padding-Prop tatsächlich übergeben wird', () => {
    const { container: withoutPadding } = render(<Card variant="glassStrong">Inhalt</Card>)
    const sectionWithoutPadding = withoutPadding.querySelector('section') as HTMLElement
    expect(sectionWithoutPadding.style.getPropertyValue('--card-padding-override')).toBe('')

    const { container: withPadding } = render(<Card variant="glassStrong" padding="content">Inhalt</Card>)
    const sectionWithPadding = withPadding.querySelector('section') as HTMLElement
    expect(sectionWithPadding.style.getPropertyValue('--card-padding-override')).toBe('var(--card-padding-content)')
  })

  it('löst jeden benannten Zweck auf sein eigenes Token auf, niemals auf eine rohe Space-Stufe', () => {
    const { container: nestedBlock } = render(<Card variant="nested" padding="nestedBlock">Inhalt</Card>)
    expect((nestedBlock.querySelector('section') as HTMLElement).style.getPropertyValue('--card-padding-override')).toBe('var(--card-padding-nested-block)')

    const { container: dividedSection } = render(<Card variant="flat" padding="dividedSection">Inhalt</Card>)
    expect((dividedSection.querySelector('section') as HTMLElement).style.getPropertyValue('--card-padding-override')).toBe('var(--card-padding-divided-section)')
  })

  it('mappt padding="none" auf den Literalwert 0 statt auf eine Space-Stufe', () => {
    const { container } = render(<Card variant="glass" padding="none">Inhalt</Card>)
    const section = container.querySelector('section') as HTMLElement
    expect(section.style.getPropertyValue('--card-padding-override')).toBe('0')
  })

  it('akzeptiert keine rohe Space-Skalenstufe mehr (TypeScript-Vertrag, siehe gapPurposeNaming.guard.test.ts für den Laufzeit-Scan)', () => {
    // @ts-expect-error -- padding="3" ist seit der Zweck-Enum-Umstellung kein gültiger Wert mehr.
    const { container } = render(<Card variant="glassStrong" padding="3">Inhalt</Card>)
    expect(container.querySelector('section')).toBeTruthy()
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
