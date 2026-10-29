import type { Meta, StoryObj } from '@storybook/nextjs'

import { Card } from './Card'

/** Card-Primitive: alle acht dokumentierten Varianten aus CardProps. */
const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { title: 'Default Card', description: 'Ruhige Standardfläche für die meisten Blöcke.' },
}

export const Elevated: Story = {
  args: { variant: 'elevated', title: 'Elevated Card', description: 'Für priorisierte Inhalte oder erste Einstiege.' },
}

export const Interactive: Story = {
  args: { variant: 'interactive', title: 'Interactive Card', description: 'Hover-verstärkte Auswahlfläche.' },
}

export const Compact: Story = {
  args: { variant: 'compact', title: 'Compact Card', description: 'Verdichtete Sektion für Listen oder kleine Hinweise.' },
}

export const Section: Story = {
  args: { variant: 'section', title: 'Section Card', description: 'Umschliesst eine ganze thematische Sektion.' },
}

export const Flat: Story = {
  args: { variant: 'flat', title: 'Flat Card', description: 'Fläche ohne Schatten, für verschachtelte Bausteine.' },
}

export const Nested: Story = {
  args: { variant: 'nested', title: 'Nested Card', description: 'Für Karten innerhalb einer anderen Karte.' },
}

export const NestedFlat: Story = {
  name: 'NestedFlat',
  args: { variant: 'nestedFlat', title: 'NestedFlat Card', description: 'Flache Variante für verschachtelte Karten.' },
}
