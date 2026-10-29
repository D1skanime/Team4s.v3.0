import type { Meta, StoryObj } from '@storybook/nextjs'

import { AdjacentNavigation } from './AdjacentNavigation'

/** Globale Vor-/Weiter-Pills für Projekt-, Release- und Sequenznavigation. */
const meta = {
  title: 'Grundbausteine/AdjacentNavigation',
  component: AdjacentNavigation,
  tags: ['autodocs'],
} satisfies Meta<typeof AdjacentNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    previous: { href: '#', label: 'Tristia of the Deep Blue Sea' },
    next: { href: '#', label: 'Viper Creed' },
  },
}

export const Floating: Story = {
  name: 'Schwebend',
  args: {
    variant: 'floating',
    previous: { href: '#', label: 'C-Subs Projekt' },
    next: { href: '#', label: 'Nächstes Release' },
  },
}

export const NurNext: Story = {
  name: 'NurNext',
  args: {
    next: { href: '#', label: 'Viper Creed' },
  },
  parameters: {
    docs: {
      description: { story: 'Fehlendes `previous`-Element: nur die "Weiter"-Pille wird gerendert.' },
    },
  },
}
