import { describe, expect, it } from 'vitest'

import { ANIME_COVER_BILD, STORYBOOK_BILD_KATALOG } from './storybookBildKatalog'

// Verhaltens-Tests für das am 2026-11-06 per Live-UAT freigegebene Bild-Katalog-Datenmodul
// (siehe quick-261106-i7g/quick-261106-hlj). Fixiert die Feldwerte und die Katalog-Länge gegen
// versehentliche Regression, ohne das Produktmodul selbst zu verändern.
describe('storybookBildKatalog', () => {
  describe('ANIME_COVER_BILD', () => {
    it('hat die stabile technische Kennung, Typbezeichnung und den statischen Bildpfad des Freezing-Covers', () => {
      expect(ANIME_COVER_BILD.id).toBe('anime-cover')
      expect(ANIME_COVER_BILD.bezeichnung).toBe('Anime-Cover')
      expect(ANIME_COVER_BILD.pfad).toBe('/storybook-bilder/anime-cover-freezing.jpg')
    })

    it('beschreibt im Alt-Text erkennbar den konkreten Anime Freezing als Bildquelle', () => {
      expect(ANIME_COVER_BILD.altText).toContain('Freezing')
    })
  })

  describe('STORYBOOK_BILD_KATALOG', () => {
    it('enthält bislang genau einen Bildtyp -- das Anime-Cover', () => {
      expect(STORYBOOK_BILD_KATALOG.length).toBe(1)
    })

    it('führt als einzigen Eintrag denselben Anime-Cover-Katalogeintrag', () => {
      expect(STORYBOOK_BILD_KATALOG[0]).toEqual(ANIME_COVER_BILD)
    })
  })
})
