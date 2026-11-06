import type { Meta, StoryObj } from '@storybook/nextjs'

import { ANIME_HINTERGRUND_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogDocsPage } from './BildKatalogShowcase.docsPage'
import { BildKatalogShowcase } from './BildKatalogShowcase'

/**
 * Beispielbild für den Bildtyp Anime-Hintergrund (Freezing).
 */
const meta = {
  title: 'Bilder/Anime-Hintergrund',
  component: BildKatalogShowcase,
  tags: ['autodocs'],
  argTypes: {
    eintrag: { table: { disable: true } },
  },
  parameters: {
    docs: {
      page: BildKatalogDocsPage,
      canvas: { sourceState: 'none' },
    },
  },
} satisfies Meta<typeof BildKatalogShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { eintrag: ANIME_HINTERGRUND_BILD },
}
