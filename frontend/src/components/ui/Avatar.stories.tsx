import type { Meta, StoryObj } from '@storybook/nextjs'

import { Avatar } from './Avatar'

/**
 * Rundes Bild oder Initialen-Kürzel für eine Person oder Gruppe, in drei Größen. Zeigt ohne
 * Bild die Initialen des Namens; kann statt Bild/Initialen auch eine Zähler-Beschriftung wie
 * "+3" für "weitere Personen" anzeigen.
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
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
    </div>
  ),
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
