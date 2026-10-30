import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { DisclosureTrigger } from './DisclosureTrigger'

/** Vollbreite, aufklappbare Kopfzeile -- Grundlage für Accordion und eigenständig nutzbar. */
const meta = {
  title: 'Zusammengesetzte Bausteine/DisclosureTrigger',
  component: DisclosureTrigger,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: DisclosureIndicator.',
      },
    },
  },
} satisfies Meta<typeof DisclosureTrigger>

export default meta
type Story = StoryObj<typeof meta>

function Demo({ initialOpen, title }: { initialOpen: boolean; title: React.ReactNode }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <DisclosureTrigger
      title={title}
      open={open}
      aria-controls="disclosure-trigger-demo-panel"
      onClick={() => setOpen((current) => !current)}
    />
  )
}

export const Geschlossen: Story = {
  name: 'Geschlossen',
  args: { title: 'Übersetzung', open: false, onClick: () => {} },
  render: () => <Demo initialOpen={false} title="Übersetzung" />,
}

export const Geoeffnet: Story = {
  name: 'Geöffnet',
  args: { title: 'Übersetzung', open: true, onClick: () => {} },
  render: () => <Demo initialOpen title="Übersetzung" />,
}

export const MitBadgeImTitel: Story = {
  name: 'Mit Badge im Titel',
  args: { title: 'Übersetzung', open: false, onClick: () => {} },
  render: () => (
    <Demo
      initialOpen={false}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Übersetzung
          <Badge variant="success">Aktiv</Badge>
        </span>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Der Titel akzeptiert beliebigen Inhalt, nicht nur Text -- hier zusätzlich ein Status-Badge.',
      },
    },
  },
}
