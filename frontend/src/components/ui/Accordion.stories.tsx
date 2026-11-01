import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Badge } from './Badge'
import { Button } from './Button'
import { Heading } from './Heading'
import { Text } from './Text'
import { Accordion } from './Accordion'

/** Aufklappbare Kategorien — unabhängig schaltbar, Touch-Ziel >= 44px, kein horizontaler Scroll. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Besteht aus: ${storybookDocsLink('Grundbausteine/DisclosureTrigger', 'DisclosureTrigger')}.`,
      },
    },
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    defaultOpenIds: new Set(['uebers']),
    items: [
      {
        id: 'uebers',
        title: 'Übersetzung',
        children: (
          <div>
            <Badge variant="success">Aktiv</Badge>
            <Text variant="soft">Enthält die Berechtigungen für diese Rolle.</Text>
          </div>
        ),
      },
      {
        id: 'bearb',
        title: 'Bearbeitung & Qualitätssicherung',
        children: (
          <div style={{ display: 'grid', gap: 8 }}>
            <Heading level={4}>Zuständigkeiten</Heading>
            <Text variant="soft">Bearbeitungs- und Qualitätssicherungs-Berechtigungen werden hier gesteuert.</Text>
            <Heading level={4}>Freigabe</Heading>
            <Text variant="soft">Änderungen gelten erst nach Bestätigung durch eine Gruppenleitung.</Text>
            <Button size="sm" variant="secondary">Details ansehen</Button>
          </div>
        ),
      },
      {
        id: 'veroefl',
        title: 'Veröffentlichung',
        children: <Text variant="soft">Veröffentlichungs-Berechtigungen gelten nur für zuweisbare Rollen.</Text>,
      },
    ],
  },
  parameters: {
    docs: {
      description: { story: 'Klickbar: Kopfzeile anklicken öffnet/schließt das jeweilige Panel, unabhängig von den anderen.' },
    },
  },
}

export const AlleGeschlossen: Story = {
  name: 'Alle geschlossen',
  args: {
    items: [
      { id: 'uebers', title: 'Übersetzung', children: <Text variant="soft">Berechtigungen für die Übersetzungsrolle.</Text> },
      { id: 'bearb', title: 'Bearbeitung & Qualitätssicherung', children: <Text variant="soft">Bearbeitungs- und Qualitätssicherungs-Berechtigungen.</Text> },
    ],
  },
}

export const NurEinsOffen: Story = {
  name: 'Nur eins offen',
  args: {
    mode: 'single',
    defaultOpenIds: new Set(['uebers']),
    items: [
      { id: 'uebers', title: 'Übersetzung', children: <Text variant="soft">Berechtigungen für die Übersetzungsrolle.</Text> },
      { id: 'bearb', title: 'Bearbeitung & Qualitätssicherung', children: <Text variant="soft">Bearbeitungs- und Qualitätssicherungs-Berechtigungen.</Text> },
      { id: 'veroefl', title: 'Veröffentlichung', children: <Text variant="soft">Veröffentlichungs-Berechtigungen gelten nur für zuweisbare Rollen.</Text> },
    ],
  },
  parameters: {
    docs: {
      description: { story: 'Öffnet man ein Panel, schließt sich automatisch jedes andere — es ist immer höchstens eines gleichzeitig offen.' },
    },
  },
}

export const LangerInhalt: Story = {
  name: 'Langer Inhalt',
  args: {
    defaultOpenIds: new Set(['lang']),
    items: [
      {
        id: 'lang',
        title: 'Historie & Hintergrund',
        children: (
          <Text variant="soft">
            Dieser aufgeklappte Inhalt ist absichtlich sehr lang, über mehrere Sätze hinweg, um zu prüfen, dass das
            Panel sauber umbricht und sich an die verfügbare Breite anpasst, ohne horizontalen Scroll zu erzeugen,
            selbst wenn der Text deutlich länger ist als bei den übrigen Einträgen dieser Liste.
          </Text>
        ),
      },
    ],
  },
}
