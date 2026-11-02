import type { Meta, StoryObj } from '@storybook/nextjs'
import { Tag } from 'lucide-react'

import { LinkChip } from './LinkChip'

/** Link in Chip-Form für Filter-/Verschlagwortungs-Listen -- zwei offizielle Töne (glass/scrim)
 *  für unterschiedlich durchscheinende Hintergründe. */
const meta = {
  title: 'Grundbausteine/LinkChip',
  component: LinkChip,
  tags: ['autodocs'],
  args: {
    href: '/suche?type=anime&genre=Drama',
    children: 'Drama',
  },
} satisfies Meta<typeof LinkChip>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const DunklerScrim: Story = {
  name: 'Dunkler Scrim',
  args: { tone: 'scrim', href: '/suche?type=anime&tag=Coming-of-Age', children: 'Coming-of-Age' },
}

export const MitZaehler: Story = {
  name: 'Mit Zähler',
  args: { count: 12 },
}

export const MitIcon: Story = {
  name: 'Mit Icon',
  args: { icon: <Tag size={14} aria-hidden="true" /> },
}

export const LangerText: Story = {
  name: 'Langer Text',
  args: { children: 'Zwischenmenschliche Beziehungen und Coming-of-Age' },
}
