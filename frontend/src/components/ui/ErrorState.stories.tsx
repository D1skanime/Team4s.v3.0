import type { Meta, StoryObj } from '@storybook/nextjs'

import { Button } from './Button'
import { ErrorState, getErrorStateCopy } from './ErrorState'

const meta = {
  title: 'Zusammengesetzte Bausteine/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Fehlerzustand-Primitive. `Status403` demonstriert den speziellen 403-Sonderfall von ' +
          '`getErrorStateCopy`/`getStatusAwareMessage` (eigene Berechtigungs-Fehlermeldung statt des ' +
          'generischen "Fehler beim Laden"). Besteht aus: Card, StatusIcon.',
      },
    },
  },
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const Generisch: Story = {
  name: 'Generisch',
  args: {
    title: 'Release-Liste konnte nicht geladen werden',
    description: 'Der Fehler bleibt lokal am betroffenen Bereich und kann direkt erneut versucht werden.',
    action: <Button variant="danger" size="sm">Erneut versuchen</Button>,
  },
}

const forbiddenCopy = getErrorStateCopy({ status: 403 })

export const Status403: Story = {
  name: 'Status403',
  args: {
    title: forbiddenCopy.title,
    description: forbiddenCopy.description,
  },
}

export const OhneAction: Story = {
  name: 'OhneAction',
  args: {
    title: 'Fehler beim Laden',
    description: 'Die Daten konnten nicht geladen werden.',
  },
}
