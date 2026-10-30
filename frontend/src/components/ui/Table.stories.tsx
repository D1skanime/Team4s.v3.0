import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { Button } from './Button'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableEmptyState } from './Table'

const rows = [
  { name: 'Anime no Hikari', status: 'Aktiv', owners: '3 Rollen', progress: '12 Versionen' },
  { name: 'Pixel Fansubs', status: 'Pausiert', owners: '1 Rolle', progress: '4 Versionen' },
  { name: 'T4 Archive Lab', status: 'Nur Lesen', owners: '2 Rollen', progress: '27 Assets' },
]

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'Aktiv':
      return 'success'
    case 'Pausiert':
      return 'danger'
    case 'Nur Lesen':
      return 'warning'
    default:
      return 'info'
  }
}

/** Tabellen-Primitive mit vier Varianten plus eingebautem Leerzustand. */
const meta = {
  title: 'Grundbausteine/Table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Tabellen-Grundstruktur (table/thead/tbody/tr/th/td). TableEmptyState nutzt für den ' +
          'Leerzustand dieselbe Optik wie EmptyState (StatusIcon, Heading, Text) -- begründete ' +
          'Ausnahme in catalogTaxonomy.test.ts, siehe dort.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  render: () => (
    <Table caption="Beispiel für einen Standard-Tabellenzustand" variant="default">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Gruppe</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Rollen</TableHeaderCell>
          <TableHeaderCell>Fortschritt</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
            <TableCell>{row.owners}</TableCell>
            <TableCell>{row.progress}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

export const Compact: Story = {
  name: 'Kompakt',
  render: () => (
    <Table variant="compact">
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

export const WithActions: Story = {
  name: 'Mit Aktionen',
  render: () => (
    <Table variant="withActions">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Gruppe</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Aktion</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">Öffnen</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

export const Selectable: Story = {
  name: 'Auswählbar',
  render: () => (
    <Table variant="selectable">
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

export const Leer: Story = {
  name: 'Leer',
  render: () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Gruppe</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableEmptyState colSpan={2} title="Keine Einträge" description="Für diese Ansicht liegen noch keine Daten vor." />
      </TableBody>
    </Table>
  ),
}
