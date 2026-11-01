import type { Meta, StoryObj } from '@storybook/nextjs'
import { Filter } from 'lucide-react'

import { Badge } from './Badge'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { Toolbar } from './Toolbar'

/** Werkzeugleiste für Such-/Filter-Zeilen oberhalb von Listen/Tabellen. */
const meta = {
  title: 'Grundbausteine/Toolbar',
  component: Toolbar,
  tags: ['autodocs'],
} satisfies Meta<typeof Toolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    leading: (
      <>
        <Input aria-label="Suche" placeholder="Suche oder Filter" />
        <Button variant="secondary" leftIcon={<Filter size={16} />}>Filter</Button>
      </>
    ),
    trailing: <Badge variant="muted">42 Ergebnisse</Badge>,
  },
}

export const NurLinkeGruppe: Story = {
  name: 'Nur linke Gruppe',
  args: {
    leading: <Input aria-label="Suche" placeholder="Suche oder Filter" />,
  },
}

export const EchtesFilterBeispiel: Story = {
  name: 'Echtes Filter-Beispiel',
  args: {
    leading: (
      <>
        <Input aria-label="Suche" placeholder="Gruppenname suchen" style={{ width: 220 }} />
        <Select aria-label="Status" defaultValue="all" style={{ width: 160 }}>
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="paused">Pausiert</option>
        </Select>
      </>
    ),
    trailing: <Badge variant="muted">12 Gruppen</Badge>,
  },
}

export const Mobil: Story = {
  name: 'Mobil',
  args: {
    leading: (
      <>
        <Input aria-label="Suche" placeholder="Suche oder Filter" />
        <Button variant="secondary" leftIcon={<Filter size={16} />}>Filter</Button>
      </>
    ),
    trailing: <Badge variant="muted">42 Ergebnisse</Badge>,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}
