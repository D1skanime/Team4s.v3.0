import type { Meta, StoryObj } from '@storybook/nextjs'

import { ProgressBar } from './ProgressBar'

/**
 * Fortschrittsbalken für Uploads und andere lang laufende Vorgänge. Zeigt entweder einen
 * bekannten Fortschritt (0-100 %) oder einen unbestimmten, sich bewegenden Zustand, wenn der
 * Fortschritt nicht in Prozent bekannt ist (z. B. während ein Server eine Datei verarbeitet).
 */
const meta = {
  title: 'Grundbausteine/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  args: {
    label: 'Wird hochgeladen',
    value: 45,
  },
} satisfies Meta<typeof ProgressBar>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Erfolgreich: Story = {
  args: { value: 100, tone: 'success', label: 'Hochgeladen' },
}

export const Fehlgeschlagen: Story = {
  args: { value: 60, tone: 'danger', label: 'Fehlgeschlagen' },
}

export const Unbestimmt: Story = {
  name: 'Unbestimmt (wird verarbeitet)',
  args: { indeterminate: true, label: 'Wird verarbeitet' },
}

export const Klein: Story = {
  args: { size: 'sm' },
}
