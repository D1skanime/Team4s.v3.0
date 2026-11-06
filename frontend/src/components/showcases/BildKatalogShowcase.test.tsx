// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ANIME_COVER_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogShowcase } from './BildKatalogShowcase'
import meta from './BildKatalogShowcase.stories'

// Verhaltens-Tests für die am 2026-11-06 per Live-UAT freigegebene Showcase-Komponente und
// Story-Meta der Kategorie "Bilder/Anime-Cover" (quick-261106-hlj, Nachbesserung quick-261106-i7g).
// Sichert insbesondere die drei dort behobenen Live-UAT-Befunde (doppelter Typname, sichtbarer
// Entwicklertext, sichtbare Steuerungstabelle für den eintrag-Prop) gegen Regression ab, ohne
// die bereits abgenommenen Produktdateien selbst zu verändern.
describe('BildKatalogShowcase', () => {
  it('zeigt genau ein Bild mit dem Pfad und Alt-Text des übergebenen Katalog-Eintrags', () => {
    const { container } = render(<BildKatalogShowcase eintrag={ANIME_COVER_BILD} />)

    const images = container.querySelectorAll('img')
    expect(images.length).toBe(1)
    expect(images[0].getAttribute('src')).toBe(ANIME_COVER_BILD.pfad)
    expect(images[0].getAttribute('alt')).toBe(ANIME_COVER_BILD.altText)
  })

  it('zeigt den Typnamen nur einmal, nicht doppelt wie vor der Live-UAT-Nachbesserung', () => {
    render(<BildKatalogShowcase eintrag={ANIME_COVER_BILD} />)

    expect(screen.getAllByText('Anime-Cover').length).toBe(1)
  })

  it('zeigt keinen Entwickler-Einleitungssatz mehr, der vor der Live-UAT-Nachbesserung sichtbar war', () => {
    const { container } = render(<BildKatalogShowcase eintrag={ANIME_COVER_BILD} />)

    expect(container.textContent).not.toContain('Rohes Beispielbild')
  })

  it('rendert keine Überschrift, da die Kategorie ausschließlich das Rohbild in den Vordergrund stellen soll', () => {
    const { container } = render(<BildKatalogShowcase eintrag={ANIME_COVER_BILD} />)

    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull()
  })

  it('blendet den eintrag-Prop weiterhin aus der Storybook-Steuerungstabelle aus, statt ihn wie vor der Nachbesserung erneut sichtbar zu machen', () => {
    expect(meta.title).toBe('Bilder/Anime-Cover')
    expect(meta.argTypes?.eintrag?.table?.disable).toBe(true)
  })
})
