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
