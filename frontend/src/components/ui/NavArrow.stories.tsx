import type { Meta, StoryObj } from '@storybook/nextjs'

import { NavArrow } from './NavArrow'

/** Wine-roter Chevron-Pfeil für Karussell-/Galerie-Navigation. */
const meta = {
  title: 'Grundbausteine/NavArrow',
  component: NavArrow,
  tags: ['autodocs'],
  args: {
    onClick: () => {},
  },
} satisfies Meta<typeof NavArrow>

export default meta
type Story = StoryObj<typeof meta>

export const Previous: Story = {
  args: { direction: 'previous', label: 'Vorheriges Bild', size: 'md' },
}

export const NextGross: Story = {
  name: 'Nächstes, groß',
  args: { direction: 'next', label: 'Nächstes Bild', size: 'lg' },
}

export const Disabled: Story = {
  args: { direction: 'next', label: 'Nächstes Bild', disabled: true },
}
