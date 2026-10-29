import type { Meta, StoryObj } from '@storybook/nextjs'

import { LoadingState } from './LoadingState'

/** Ladezustand-Primitive für Bereiche, die noch keine Daten haben. */
const meta = {
  title: 'UI/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
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
  name: 'OhneBeschreibung',
  args: {
    title: 'Inhalt wird vorbereitet',
    description: '',
  },
}
