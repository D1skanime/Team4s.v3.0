import type { Meta, StoryObj } from '@storybook/nextjs'
import { Filter } from 'lucide-react'

import { Badge } from './Badge'
import { Button } from './Button'
import { Input } from './Input'
import { Toolbar } from './Toolbar'

/** Werkzeugleiste für Such-/Filter-Zeilen oberhalb von Listen/Tabellen. */
const meta = {
  title: 'UI/Toolbar',
  component: Toolbar,
  tags: ['autodocs'],
} satisfies Meta<typeof Toolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    leading: (
      <>
        <Input placeholder="Suche oder Filter" />
        <Button variant="secondary" leftIcon={<Filter size={16} />}>Filter</Button>
      </>
    ),
    trailing: <Badge variant="muted">42 Ergebnisse</Badge>,
  },
}

export const NurLeading: Story = {
  name: 'NurLeading',
  args: {
    leading: <Input placeholder="Suche oder Filter" />,
  },
}
