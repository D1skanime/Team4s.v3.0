import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Badge } from './Badge'
import { BannerSection } from './BannerSection'

/** Abschnitt mit Bannerbild-Hintergrund + WCAG-AA-Scrim -- übernimmt die Positionierungsrolle
 *  einer seiten-eigenen Hero-Banner-Box, braucht deshalb einen positionierten Eltern-Container
 *  mit fester Höhe (hier über die Story-Dekoration simuliert). */
const meta = {
  title: 'Zusammengesetzte Bausteine/BannerSection',
  component: BannerSection,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `Besteht aus: ${storybookDocsLink('Grundbausteine/ResponsiveImage', 'ResponsiveImage')} für das ` +
          'Hintergrundbild sowie einem eigenen Scrim-/Badge-Layer. Fachbausteine wie AnimeBackdropRotator ' +
          'werden als `children` innerhalb des Abschnitts komponiert (kein eigener Storybook-Link, da kein ' +
          'components/ui-Baustein).',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 240, borderRadius: 12, overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    imageUrl: '/covers/placeholder.jpg',
    imageAlt: 'Frühlingsblüten über Tokio Hintergrundbild',
  },
} satisfies Meta<typeof BannerSection>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const OhneBild: Story = {
  name: 'Ohne Bild',
  args: { imageUrl: null },
}

export const MitStarkemScrimUndBadge: Story = {
  name: 'Mit starkem Scrim und Badge',
  args: {
    withTextScrim: true,
    badge: <Badge variant="onMedia">Ongoing</Badge>,
  },
}
