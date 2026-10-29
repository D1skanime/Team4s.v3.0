import type { Meta, StoryObj } from '@storybook/nextjs'

import { NavArrow } from './NavArrow'

/**
 * Wine-roter Chevron-Pfeil für Karussell-/Galerie-Navigation, aufgebaut auf IconButtons
 * `variant="ghost"` (Befund 8) -- sichtbare Komposition statt eigenem Nachbau, daher unter
 * "Zusammengesetzte Bausteine" statt "Grundbausteine" (analog zu Modal/Drawer).
 */
const meta = {
  title: 'Zusammengesetzte Bausteine/NavArrow',
  component: NavArrow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: IconButton.',
      },
    },
  },
  args: {
    onClick: () => {},
  },
} satisfies Meta<typeof NavArrow>

export default meta
type Story = StoryObj<typeof meta>

export const Previous: Story = {
  name: 'Vorheriges',
  args: { direction: 'previous', label: 'Vorheriges Bild', size: 'md' },
}

export const NextGross: Story = {
  name: 'Nächstes, groß',
  args: { direction: 'next', label: 'Nächstes Bild', size: 'lg' },
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: { direction: 'next', label: 'Nächstes Bild', disabled: true },
}
