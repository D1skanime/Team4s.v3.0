import type { Meta, StoryObj } from '@storybook/nextjs'

import { Divider } from './Divider'

/** Neutrale, themenfarbene Trennlinie für Inhalte auf einer dunklen/durchscheinenden Fläche --
 *  setzt selbst Ton (Farbe) und Abstand (Margin), ein Aufrufer braucht keine eigene <hr>+CSS
 *  mehr. Jede Story liegt über einem dunklen Flächen-Dekorator, da die Linie auf dem hellen
 *  Storybook-Canvas sonst unsichtbar wäre. */
const meta = {
  title: 'Grundbausteine/Divider',
  component: Divider,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#1c1c1e', padding: 24, width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const OnMediaBetweenSections: Story = {
  name: 'Dezent, zwischen Abschnitten (Standard)',
  args: { tone: 'onMedia', spacing: 'betweenSections' },
}

export const OnMediaWithinMetaBlock: Story = {
  name: 'Dezent, innerhalb eines Meta-Blocks',
  args: { tone: 'onMedia', spacing: 'withinMetaBlock' },
}

export const OnMediaStrongBetweenSections: Story = {
  name: 'Kräftig, zwischen Abschnitten',
  args: { tone: 'onMediaStrong', spacing: 'betweenSections' },
}

export const OnMediaStrongWithinMetaBlock: Story = {
  name: 'Kräftig, innerhalb eines Meta-Blocks',
  args: { tone: 'onMediaStrong', spacing: 'withinMetaBlock' },
}

export const OnMediaNoSpacing: Story = {
  name: 'Dezent, ohne eigenen Abstand',
  args: { tone: 'onMedia', spacing: 'none' },
  parameters: {
    docs: {
      description: {
        story:
          'Für den Fall, dass ein umgebender Rhythmus-Mechanismus (z. B. Stacks Rhythmus-Array-Modus) den vollständigen Vorlauf-/Nachlauf-Abstand bereits selbst trägt -- die Trennlinie steuert hier wirklich nur noch die sichtbare Linie bei, ohne den fremd festgelegten Rhythmus durch einen eigenen, nicht abschaltbaren Zusatz-Abstand zu verfälschen.',
      },
    },
  },
}
