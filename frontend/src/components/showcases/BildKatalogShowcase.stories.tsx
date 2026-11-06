import type { Meta, StoryObj } from '@storybook/nextjs'

import { ANIME_COVER_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogShowcase } from './BildKatalogShowcase'

/**
 * Erster Eintrag der neuen Storybook-Kategorie "Bilder/*": zeigt das echte, Jellyfin-bezogene
 * Primärbild von Freezing (Anime-ID 13) roh, ohne MediaFrame/Rahmen/Rundung/Schatten/Verlauf,
 * mit der Typbezeichnung "Anime-Cover" darunter. Bild und Pfad kommen aus dem zentralen
 * Katalog `frontend/src/lib/storybookBildKatalog.ts` statt aus einem hier erneut hart
 * codierten Pfad-String.
 */
const meta = {
  title: 'Bilder/Anime-Cover',
  component: BildKatalogShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof BildKatalogShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { eintrag: ANIME_COVER_BILD },
}
