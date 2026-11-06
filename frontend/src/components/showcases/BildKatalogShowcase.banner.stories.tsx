import type { Meta, StoryObj } from '@storybook/nextjs'

import { ANIME_BANNER_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogShowcase } from './BildKatalogShowcase'

/**
 * Beispielbild des Bildtyps Banner (Medienordner `media/anime/<id>/banner/`). Dieser Eintrag
 * zeigt das echte, Jellyfin-bezogene Banner-Bild von Freezing (Anime-ID 13) mit der
 * Typbezeichnung "Anime-Banner" darunter. Bild und Beschriftung stammen aus dem zentralen
 * Katalog `frontend/src/lib/storybookBildKatalog.ts`.
 */
const meta = {
  title: 'Bilder/Anime-Banner',
  component: BildKatalogShowcase,
  tags: ['autodocs'],
  argTypes: {
    eintrag: { table: { disable: true } },
  },
} satisfies Meta<typeof BildKatalogShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { eintrag: ANIME_BANNER_BILD },
}
