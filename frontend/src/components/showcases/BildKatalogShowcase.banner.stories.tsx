import type { Meta, StoryObj } from '@storybook/nextjs'

import { ANIME_BANNER_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogShowcase } from './BildKatalogShowcase'

/**
 * Beispielbild für den Bildtyp Anime-Banner (Freezing).
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
