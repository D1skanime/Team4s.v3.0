import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { SectionHeader } from './SectionHeader'

/** Sekundärer Abschnitts-Header innerhalb einer Seite. */
const meta = {
  title: 'UI/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof SectionHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    eyebrow: '01',
    title: 'Design Tokens Preview',
    description:
      'Die visuelle Basis bleibt ruhig und neutral, mit einem kühleren blau-tealigen Akzent für Primäraktionen und klare Hierarchie.',
    actions: <Badge variant="muted">12 Einträge</Badge>,
  },
}

export const OhneDescription: Story = {
  name: 'OhneDescription',
  args: {
    title: 'Mitgliederübersicht',
  },
}
