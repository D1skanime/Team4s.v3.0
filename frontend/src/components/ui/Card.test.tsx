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

  it('loest die neuen Zweck-Werte "section" (32px) und "contextCard" (24px) auf ihre eigenen, von jedem bisherigen Zweck verschiedenen Token auf', () => {
    const { container: section } = render(<Card variant="section" padding="section">Inhalt</Card>)
    expect((section.querySelector('section') as HTMLElement).style.getPropertyValue('--card-padding-override')).toBe('var(--card-padding-section)')

    const { container: contextCard } = render(<Card variant="glass" padding="contextCard">Inhalt</Card>)
    expect((contextCard.querySelector('section') as HTMLElement).style.getPropertyValue('--card-padding-override')).toBe('var(--card-padding-context-card)')
  })

  it('bleedBelowMd ist ohne Angabe byte-identisch zum bisherigen Render (keine neue Klasse/kein neuer Inline-Stil)', () => {
    const { container } = render(<Card variant="nested">Inhalt</Card>)
    const section = container.querySelector('section') as HTMLElement
    expect(section.className).not.toMatch(/cardBleedBelowMd/)
  })

  it('bleedBelowMd=true setzt die Rand-bis-Rand-Modifikatorklasse, ohne eine bestehende Variantenklasse zu ersetzen', () => {
    const { container } = render(<Card variant="nested" bleedBelowMd>Inhalt</Card>)
    const section = container.querySelector('section') as HTMLElement
    expect(section.className).toMatch(/cardNested/)
    expect(section.className).toMatch(/cardBleedBelowMd/)
  })

  it('widthPurpose ist ohne Angabe byte-identisch zum bisherigen Render (kein --card-width-override gesetzt)', () => {
    const { container } = render(<Card variant="glassStrong">Inhalt</Card>)
    const section = container.querySelector('section') as HTMLElement
    expect(section.style.getPropertyValue('--card-width-override')).toBe('')
  })

  it('widthPurpose="compactPreview" setzt --card-width-override auf das eigene Zweck-Token, nicht auf ein lokales Breiten-Literal', () => {
    const { container } = render(<Card variant="glassStrong" widthPurpose="compactPreview">Inhalt</Card>)
    const section = container.querySelector('section') as HTMLElement
    expect(section.style.getPropertyValue('--card-width-override')).toBe('var(--card-width-compact-preview)')
  })

  it('seamless ist ohne Angabe byte-identisch zum bisherigen Render (keine neue Klasse)', () => {
    const { container } = render(<Card variant="flat">Inhalt</Card>)
    const section = container.querySelector('section') as HTMLElement
    expect(section.className).not.toMatch(/cardSeamless/)
  })

  it('seamless=true setzt die randlose Modifikatorklasse zusaetzlich zur bestehenden Variantenklasse', () => {
    const { container } = render(<Card variant="flat" seamless>Inhalt</Card>)
    const section = container.querySelector('section') as HTMLElement
    expect(section.className).toMatch(/cardFlat/)
    expect(section.className).toMatch(/cardSeamless/)
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

  it('cardPublicHeroInfo zeroed die Rahmenbreite statt nur die -farbe, damit der Verlaufshintergrund nicht per background-repeat in eine verbleibende Randflaeche hineinwiederholt', () => {
    const match = css.match(/\.cardPublicHeroInfo\s*\{([^}]+)\}/)
    expect(match, '.cardPublicHeroInfo muss existieren').toBeTruthy()
    const rule = match![1]
    expect(rule).toMatch(/border-width:\s*0;/)
    expect(rule).not.toMatch(/border-color:\s*transparent;/)
    expect(rule).not.toMatch(/border-top-color:\s*transparent;/)
  })

  it('cardSeamless zeroed Rahmenbreite/-radius/Hintergrund und steht NACH .cardFlat/.cardNested/.cardNestedFlat, damit es bei gleicher Spezifitaet gewinnt', () => {
    const seamlessMatch = css.match(/\.cardSeamless\s*\{([^}]+)\}/)
    expect(seamlessMatch, '.cardSeamless muss existieren').toBeTruthy()
    const seamlessRule = seamlessMatch![1]
    expect(seamlessRule).toMatch(/border-width:\s*0;/)
    expect(seamlessRule).toMatch(/border-radius:\s*0;/)
    expect(seamlessRule).toMatch(/background:\s*transparent;/)

    const seamlessIndex = css.indexOf('.cardSeamless')
    const flatIndex = css.indexOf('.cardFlat')
    const nestedIndex = css.indexOf('.cardNested {')
    const nestedFlatIndex = css.indexOf('.cardNestedFlat')
    expect(seamlessIndex).toBeGreaterThan(flatIndex)
    expect(seamlessIndex).toBeGreaterThan(nestedIndex)
    expect(seamlessIndex).toBeGreaterThan(nestedFlatIndex)
  })

  it('bleedBelowMd kollabiert unterhalb 767px nur die horizontale Polsterung auf 0 und zentriert die Grid-Kinder, ohne die vertikale Polsterung zu berühren', () => {
    const mobileBlockStart = css.indexOf('@media (max-width: 767px)')
    expect(mobileBlockStart).toBeGreaterThan(-1)
    const bleedRule = css.slice(mobileBlockStart).match(/\.cardBleedBelowMd\s*\{([^}]+)\}/)?.[1]
    expect(bleedRule, '.cardBleedBelowMd must exist inside the mobile media query').toBeTruthy()
    expect(bleedRule).toMatch(/padding-left:\s*0;/)
    expect(bleedRule).toMatch(/padding-right:\s*0;/)
    expect(bleedRule).toMatch(/justify-items:\s*center;/)
    expect(bleedRule).not.toMatch(/padding-top/)
    expect(bleedRule).not.toMatch(/padding-bottom/)
  })
})
