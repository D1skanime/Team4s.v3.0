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

  it('rendert jedes der fünf Beispiele als Vorher/Nachher-Paar über dem echten Beispielbild, nicht über einer CSS-Nachbildung', () => {
    const { container } = render(<EffectsShowcase />)
    const fixtureImages = container.querySelectorAll('img[alt="Beispielbild für die Effekt-Vorschau"]')
    // Jedes der 5 Beispiele zeigt zwei Bild-Instanzen (Vorher + Nachher) desselben Fixture-Bilds.
    expect(fixtureImages.length).toBe(10)

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

  it('verwendet in der Beschreibung ausschließlich jargonfreies Deutsch (kein "Rezeptur"/"domänenfreie CSS-Nachbildung")', () => {
    const { container } = render(<EffectsShowcase />)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/Rezeptur/)
    expect(text).not.toMatch(/domänenfreie CSS-Nachbildung/)
  })
})
