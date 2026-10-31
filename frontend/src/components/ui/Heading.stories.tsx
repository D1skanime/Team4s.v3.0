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

export const HeroTitel: Story = {
  name: 'Hero-Titel',
  args: { level: 1, size: 'hero', children: 'Fansub-Gruppe C-Subs' },
  parameters: {
    docs: {
      description: {
        story: 'Größenstufe zwischen H1 und H2 für prominente, aber kompakte Titel, z. B. in einer Profil- oder Gruppen-Kopfzeile.',
      },
    },
  },
}

export const AkzentTon: Story = {
  name: 'Akzent-Ton',
  args: { level: 2, size: 'hero', tone: 'accent', children: '1.284' },
  parameters: {
    docs: {
      description: {
        story: 'Färbt die Überschrift in --accent-deep statt der Standardfarbe --text-strong, z. B. für eine hervorgehobene Kennzahl (siehe MetricList).',
      },
    },
  },
}

export const AufDunklemHintergrund: Story = {
  name: 'Auf dunklem Hintergrund',
  args: { level: 2, size: 'hero', tone: 'onScrim', children: '1.284' },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, background: '#1c1c1e', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'tone="onScrim" hält die Überschrift auf einem dunklen Hintergrund (z. B. ein Foto-Banner mit Scrim) lesbar, WCAG-kontrastgeprüft.',
      },
    },
  },
}
