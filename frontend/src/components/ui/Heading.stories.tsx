import type { Meta, StoryObj } from '@storybook/nextjs'

import { Heading } from './Heading'

/**
 * Typografie-Grundbaustein für Überschriften: `level` bestimmt das semantische Tag (h1-h4),
 * `size` (optional, Standard = `level`) bestimmt die visuelle Größenstufe unabhängig davon.
 */
const meta = {
  title: 'Grundbausteine/Heading',
  component: Heading,
  tags: ['autodocs'],
} satisfies Meta<typeof Heading>

export default meta
type Story = StoryObj<typeof meta>

export const H1: Story = {
  args: { level: 1, children: 'Naruto' },
}

export const H2: Story = {
  args: { level: 2, children: 'Anime bearbeiten' },
}

export const H3: Story = {
  args: { level: 3, children: 'Übersicht' },
}

export const H4: Story = {
  args: { level: 4, children: 'Verknüpfte Anime' },
}

export const AbweichendeVisuelleGroesse: Story = {
  name: 'Abweichende visuelle Größe',
  args: { level: 3, size: 2, children: 'Semantisch h3, visuell wie H2' },
}
