import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { Button } from './Button'
import { ActionBar } from './ActionBar'

/** Aktionsleiste für Edit-Flows: Leading-Status links, Button-Gruppe rechts. */
const meta = {
  title: 'UI/ActionBar',
  component: ActionBar,
  tags: ['autodocs'],
} satisfies Meta<typeof ActionBar>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    leading: <Badge variant="muted">Ungespeicherte Änderungen</Badge>,
    trailing: (
      <>
        <Button variant="ghost">Abbrechen</Button>
        <Button variant="danger">Löschen</Button>
        <Button variant="success">Speichern</Button>
      </>
    ),
  },
}

export const NurTrailing: Story = {
  name: 'NurTrailing',
  args: {
    trailing: <Button variant="secondary">Schließen</Button>,
  },
}
