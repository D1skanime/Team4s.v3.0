import type { Meta, StoryObj } from '@storybook/nextjs'

import { FANSUB_LOGO_BILD } from '@/lib/storybookBildKatalog'

import { BildKatalogDocsPage } from './BildKatalogShowcase.docsPage'
import { BildKatalogShowcase } from './BildKatalogShowcase'

/**
 * Beispielbild für den Bildtyp Fansub-Logo (Bloody-Shadow).
 */
const meta = {
  title: 'Bilder/Fansub-Logo',
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
  args: { eintrag: FANSUB_LOGO_BILD },
}
