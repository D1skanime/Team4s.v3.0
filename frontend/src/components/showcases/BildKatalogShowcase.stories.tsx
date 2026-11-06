import type { Meta, StoryObj } from '@storybook/nextjs'

import { ANIME_COVER_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogShowcase } from './BildKatalogShowcase'

/**
 * Beispielbilder der Bildtypen in Team4S. Dieser erste Eintrag zeigt das echte,
 * Jellyfin-bezogene Primärbild von Freezing (Anime-ID 13) mit der Typbezeichnung
 * "Anime-Cover" darunter. Bild und Beschriftung stammen aus dem zentralen Katalog
 * `frontend/src/lib/storybookBildKatalog.ts`.
 */
const meta = {
  title: 'Bilder/Anime-Cover',
  component: BildKatalogShowcase,
  tags: ['autodocs'],
  argTypes: {
    eintrag: { table: { disable: true } },
  },
} satisfies Meta<typeof BildKatalogShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { eintrag: ANIME_COVER_BILD },
}
