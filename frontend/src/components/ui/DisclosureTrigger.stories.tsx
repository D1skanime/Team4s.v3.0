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

export const Geschlossen: Story = {
  name: 'Geschlossen',
  args: {
    title: 'Übersetzung',
    open: false,
    'aria-controls': 'disclosure-trigger-demo-panel',
    onClick: () => {},
  },
}

export const Geoeffnet: Story = {
  name: 'Geöffnet',
  args: {
    title: 'Übersetzung',
    open: true,
    'aria-controls': 'disclosure-trigger-demo-panel',
    onClick: () => {},
  },
}

export const MitBadgeImTitel: Story = {
  name: 'Mit Badge im Titel',
  args: {
    title: 'Übersetzung',
    open: false,
    onClick: () => {},
  },
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <DisclosureTrigger
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Übersetzung
              <Badge variant="success">Aktiv</Badge>
            </span>
          }
          open={open}
          aria-controls="disclosure-trigger-demo-panel-badge"
          onClick={() => setOpen((current) => !current)}
        />
      )
    }
    return <Demo />
  },
  parameters: {
    docs: {
      description: {
        story: 'Der Titel akzeptiert beliebigen Inhalt, nicht nur Text -- hier zusätzlich ein Status-Badge.',
      },
    },
  },
}
