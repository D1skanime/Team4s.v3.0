import type { Meta, StoryObj } from '@storybook/nextjs'

import { ANIME_LOGO_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogDocsPage } from './BildKatalogShowcase.docsPage'
import { BildKatalogShowcase } from './BildKatalogShowcase'

/**
 * Beispielbild für den Bildtyp Anime-Logo (Freezing).
 */
const meta = {
  title: 'Bilder/Anime-Logo',
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
  args: { eintrag: ANIME_LOGO_BILD },
}
