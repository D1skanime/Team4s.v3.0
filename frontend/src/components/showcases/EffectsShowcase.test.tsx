// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EffectsShowcase } from './EffectsShowcase'

describe('EffectsShowcase', () => {
  it('zeigt alle fünf Effekt-Rezepturen mit Name, Zweck und konsumierendem Grundbaustein', () => {
    render(<EffectsShowcase />)

    const expectedEntries = [
      {
        name: 'Bannerbild-Hintergrund (unscharf)',
        purposeFragment: 'Unschärfe',
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

  it('rendert jede Vorschau über dem echten konsumierenden Grundbaustein (BannerSection-Bild), nicht über einer CSS-Nachbildung', () => {
    const { container } = render(<EffectsShowcase />)
    const backgroundImages = container.querySelectorAll('img[alt="Beispielbild für die Effekt-Vorschau"]')
    // Jede der 5 Rezepturen wird über BannerSection (mit echtem Hintergrundbild) gezeigt.
    expect(backgroundImages.length).toBe(5)
  })
})
