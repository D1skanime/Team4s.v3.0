import type { Meta, StoryObj } from '@storybook/nextjs'

import { HeroMetrics } from './HeroMetrics'

/** Kennzahlen-Leiste für Hero-Flächen (Bezeichnung oben dunkel, Wert darunter blau). */
const meta = {
  title: 'Zusammengesetzte Bausteine/HeroMetrics',
  component: HeroMetrics,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Button.',
      },
    },
  },
  args: {
    ariaLabel: 'Beispiel-Kennzahlen',
    items: [
      { label: 'Anime-Projekte', value: 20 },
      { label: 'Release-Versionen', value: 59 },
      { label: 'Mitglieder', value: 4 },
    ],
  },
} satisfies Meta<typeof HeroMetrics>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Inline: Story = {
  args: { variant: 'inline' },
}
