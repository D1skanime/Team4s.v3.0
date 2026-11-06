import type { Meta, StoryObj } from '@storybook/nextjs'

import { Avatar } from './Avatar'

/**
 * Rundes Bild oder Initialen-Kürzel für eine Person oder Gruppe, in vier Größen. Zeigt ohne
 * Bild die Initialen des Namens; kann statt Bild/Initialen auch eine Zähler-Beschriftung wie
 * "+3" für "weitere Personen" anzeigen. Die kleinste Größe (`xs`) und der optionale `bordered`-
 * Rand decken das wiederkehrende Muster eines kleinen, runden Gruppen-/Identitätsbilds auf
 * dunklem Untergrund ab (z. B. ein Fansub-Gruppen-Logo in einer Chip-Zeile).
 */
const meta = {
  title: 'Grundbausteine/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: {
    label: 'Mira Sato',
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initialen: Story = {
  name: 'Initialen',
}

export const MitBild: Story = {
  name: 'Mit Bild',
  args: {
    // Lokale Datei statt einer echten externen Unsplash-URL: Letztere lief als nicht gemockter
    // Live-Request unbemerkt am MSW-Netzwerk-Mocking vorbei (Regressionsfund, siehe preview.tsx
    // onUnhandledRequest: 'error') -- Storybook-Stories dürfen nicht von einem erreichbaren
    // externen Dienst abhängen.
    src: '/covers/placeholder.png',
    label: 'Mira Sato',
  },
}

export const Groessen: Story = {
  name: 'Größen',
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Avatar {...args} size="xs" />
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
    </div>
  ),
}

export const KleinesGruppenbildMitRand: Story = {
  name: 'Kleines Gruppenbild mit Rand (xs, bordered)',
  args: {
    label: 'LazySubs',
    size: 'xs',
    src: '/covers/placeholder.png',
    bordered: true,
  },
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: 'var(--surface-stage)' }}>
      <Avatar {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Die 20px-Größenstufe plus der Rand "auf dunkler Fläche" decken dasselbe wiederkehrende Muster ab wie ein kleines Fansub-Gruppen-Logo in einer Chip-Zeile oder das Gruppen-Logo einer Release-Zeile -- beide brauchen keine eigene Breiten-/Rundungs-/Rand-CSS mehr.',
      },
    },
  },
}

export const Farben: Story = {
  name: 'Farben',
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      {([1, 2, 3, 4, 5, 6] as const).map((colorIndex) => (
        <Avatar key={colorIndex} label={`Gruppe ${colorIndex}`} colorIndex={colorIndex} />
      ))}
    </div>
  ),
}

export const Zaehler: Story = {
  name: 'Zähler (+N)',
  args: {
    label: '3 weitere Mitglieder',
    count: 3,
  },
}
