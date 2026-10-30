import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { Accordion } from './Accordion'

/** Aufklappbare Kategorien — unabhängig schaltbar, Touch-Ziel >= 44px, kein horizontaler Scroll. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Besteht aus: DisclosureIndicator (natives button als dokumentierte ARIA-Widget-Ausnahme).',
      },
    },
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    openIds: new Set(['uebers']),
    onOpenChange: () => {},
    items: [
      {
        id: 'uebers',
        title: 'Übersetzung',
        children: (
          <div>
            <Badge variant="success">Aktiv</Badge>
            <p>Dieser Bereich zeigt Capability-Switches für die Übersetzungsrolle.</p>
          </div>
        ),
      },
      {
        id: 'bearb',
        title: 'Bearbeitung & Qualitätssicherung',
        children: <p>Bearbeitungs- und QS-Berechtigungen werden hier gesteuert.</p>,
      },
      {
        id: 'veroefl',
        title: 'Veröffentlichung',
        children: <p>Veröffentlichungs-Capabilities sind nur für zuweisbare Rollen aktiv.</p>,
      },
    ],
  },
}

export const AlleGeschlossen: Story = {
  name: 'Alle geschlossen',
  args: {
    openIds: new Set(),
    onOpenChange: () => {},
    items: [
      { id: 'uebers', title: 'Übersetzung', children: <p>Capability-Switches für die Übersetzungsrolle.</p> },
      { id: 'bearb', title: 'Bearbeitung & Qualitätssicherung', children: <p>Bearbeitungs- und QS-Berechtigungen.</p> },
    ],
  },
}

export const LangerInhalt: Story = {
  name: 'Langer Inhalt',
  args: {
    openIds: new Set(['lang']),
    onOpenChange: () => {},
    items: [
      {
        id: 'lang',
        title: 'Historie & Hintergrund',
        children: (
          <p>
            Dieser aufgeklappte Inhalt ist absichtlich sehr lang, über mehrere Sätze hinweg, um zu prüfen, dass das
            Panel sauber umbricht und sich an die verfügbare Breite anpasst, ohne horizontalen Scroll zu erzeugen,
            selbst wenn der Text deutlich länger ist als bei den übrigen Einträgen dieser Liste.
          </p>
        ),
      },
    ],
  },
}
