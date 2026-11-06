// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EffectsShowcase } from './EffectsShowcase'

describe('EffectsShowcase', () => {
  it('zeigt alle fünf Effekt-Beispiele mit Name, Zweck und konsumierendem Grundbaustein', () => {
    render(<EffectsShowcase />)

    const expectedEntries = [
      {
        name: 'Bannerbild-Hintergrund (unscharf)',
        purposeFragment: 'Unscharfer, abgedunkelter',
        usedBy: 'BannerSection',
      },
      {
        name: 'Glas-Fläche auf hellem Bildhintergrund',
        purposeFragment: 'Heller, durchscheinender',
        usedBy: 'LinkChip (tone="glass")',
      },
      {
        name: 'Abdunklung unter Chip-Text auf Bild',
        purposeFragment: 'Dunkler, blickdichterer',
        usedBy: 'LinkChip (tone="scrim")',
      },
      {
        name: 'Glas-Knopf auf Bildfläche',
        purposeFragment: 'Durchscheinender Umschalt-Knopf',
        usedBy: 'Button (variant="chipGlass")',
      },
      {
        name: 'Abzeichen auf Bildfläche',
        purposeFragment: 'Dunkel abgesetzter',
        usedBy: 'Badge (variant="onMedia")',
      },
    ]

    for (const entry of expectedEntries) {
      expect(screen.getAllByText(entry.name).length).toBeGreaterThan(0)
      expect(screen.getByText(new RegExp(entry.purposeFragment))).not.toBeNull()
      expect(screen.getByText(new RegExp(`Eingesetzt in:.*${entry.usedBy.replace(/[()".]/g, '\\$&')}`))).not.toBeNull()
    }
  })

  it('rendert jedes der fünf Beispiele als Vorher/Nachher-Paar über einem echten Beispielbild, nicht über einer CSS-Nachbildung', () => {
    const { container } = render(<EffectsShowcase />)
    // Vier der fünf Beispiele (Glas-Chip/Scrim-Chip/Glas-Knopf/Abzeichen) teilen sich das
    // allgemeine Fixture-Bild -- je zwei Bild-Instanzen (Vorher + Nachher) pro Beispiel.
    const sharedFixtureImages = container.querySelectorAll('img[alt="Beispielbild für die Effekt-Vorschau"]')
    expect(sharedFixtureImages.length).toBe(8)
    // Der Banner-Eintrag nutzt ein eigenes, kontrastreicheres Bannerfoto-Fixture (siehe nächster
    // Test) -- ebenfalls als Vorher/Nachher-Paar, zwei Bild-Instanzen.
    const bannerFixtureImages = container.querySelectorAll('img[alt="Beispiel-Bannerfoto für die Unschärfe-Vorschau"]')
    expect(bannerFixtureImages.length).toBe(2)

    expect(screen.getAllByText('Ohne Effekt').length).toBe(5)
    expect(screen.getAllByText('Mit Effekt').length).toBe(5)
  })

  it('verwendet das echte, farbige Anime-Cover statt des früheren, fast leeren Platzhalterbilds', () => {
    const { container } = render(<EffectsShowcase />)
    const fixtureImages = container.querySelectorAll('img[alt="Beispielbild für die Effekt-Vorschau"]')
    for (const img of Array.from(fixtureImages)) {
      const src = img.getAttribute('src') ?? ''
      expect(src).toContain('cover_1775167905284')
      expect(src).not.toContain('placeholder.jpg')
    }
  })

  it('verwendet für den Banner-Eintrag ein eigenes, kontrastreicheres Fixture-Bild statt des engen Hochformat-Coverbilds der übrigen vier Beispiele', () => {
    const { container } = render(<EffectsShowcase />)
    const bannerFixtureImages = container.querySelectorAll('img[alt="Beispiel-Bannerfoto für die Unschärfe-Vorschau"]')
    expect(bannerFixtureImages.length).toBe(2)
    for (const img of Array.from(bannerFixtureImages)) {
      const src = img.getAttribute('src') ?? ''
      // Dieselbe Datei, die FansubHeroSection.stories.tsx bereits als banner_url-Fixture nutzt --
      // nicht das enge Hochformat-Coverbild der übrigen vier Beispiele.
      expect(src).toContain('cover_1775164698913')
      expect(src).not.toContain('cover_1775167905284')
    }
  })

  it('verwendet in der Beschreibung ausschließlich jargonfreies Deutsch (kein "Rezeptur"/"domänenfreie CSS-Nachbildung")', () => {
    const { container } = render(<EffectsShowcase />)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/Rezeptur/)
    expect(text).not.toMatch(/domänenfreie CSS-Nachbildung/)
  })
})
