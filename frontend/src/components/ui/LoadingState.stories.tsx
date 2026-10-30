import type { Meta, StoryObj } from '@storybook/nextjs'

import { LoadingState } from './LoadingState'

const meta = {
  title: 'Zusammengesetzte Bausteine/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Ladezustand-Primitive für Bereiche, die noch keine Daten haben. Besteht aus: Card, Spinner, Heading, Text.',
      },
    },
  },
} satisfies Meta<typeof LoadingState>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    title: 'Release-Daten werden geladen',
    description: 'Die Übersicht baut sich auf, bevor weitere Aktionen möglich sind.',
  },
}

export const OhneBeschreibung: Story = {
  name: 'Ohne Beschreibung',
  args: {
    title: 'Inhalt wird vorbereitet',
    description: '',
  },
}
