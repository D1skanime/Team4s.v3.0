import type { Meta, StoryObj } from '@storybook/nextjs'

import { Card } from './Card'

/** Card-Primitive: alle acht dokumentierten Varianten aus CardProps. */
const meta = {
  title: 'Grundbausteine/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Grundfläche mit optionalem Titel/Beschreibung -- kann Heading und Text als Titel enthalten ' +
          '(begründete Ausnahme in catalogTaxonomy.test.ts: Heading/Text sind geteilte Typografie-' +
          'Grundbausteine, keine sichtbar komponierte Baustein-Kombination wie bei PageHeader/' +
          'SectionHeader, die deshalb unter "Zusammengesetzte Bausteine" stehen).',
      },
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Standard',
  args: { title: 'Standard-Karte', description: 'Ruhige Standardfläche für die meisten Blöcke.' },
}

export const Elevated: Story = {
  name: 'Angehoben',
  args: { variant: 'elevated', title: 'Angehobene Karte', description: 'Für priorisierte Inhalte oder erste Einstiege.' },
}

export const Interactive: Story = {
  name: 'Interaktiv',
  args: { variant: 'interactive', title: 'Interaktive Karte', description: 'Hover-verstärkte Auswahlfläche.' },
}

export const Compact: Story = {
  name: 'Kompakt',
  args: { variant: 'compact', title: 'Kompakte Karte', description: 'Verdichtete Sektion für Listen oder kleine Hinweise.' },
}

export const Section: Story = {
  name: 'Abschnitt',
  args: { variant: 'section', title: 'Abschnitts-Karte', description: 'Umschließt eine ganze thematische Sektion.' },
}

export const Flat: Story = {
  name: 'Flach',
  args: { variant: 'flat', title: 'Flache Karte', description: 'Fläche ohne Schatten, für verschachtelte Bausteine.' },
}

export const Nested: Story = {
  name: 'Verschachtelt',
  args: { variant: 'nested', title: 'Verschachtelte Karte', description: 'Für Karten innerhalb einer anderen Karte.' },
}

export const NestedFlat: Story = {
  name: 'Verschachtelt flach',
  args: { variant: 'nestedFlat', title: 'Flache verschachtelte Karte', description: 'Flache Variante für verschachtelte Karten.' },
}
