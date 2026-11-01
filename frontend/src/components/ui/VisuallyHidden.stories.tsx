import type { Meta, StoryObj } from '@storybook/nextjs'

import { VisuallyHidden } from './VisuallyHidden'

/**
 * Versteckt Text optisch, lässt ihn aber für Screenreader und Tastaturnutzung erreichbar.
 * Für Beschriftungen, die nur Screenreader brauchen (z. B. ein vollständiger Name neben einem
 * Kürzel, oder eine Beschriftung für ein Eingabefeld, das keinen sichtbaren Text haben soll).
 */
const meta = {
  title: 'Grundbausteine/VisuallyHidden',
  component: VisuallyHidden,
  tags: ['autodocs'],
  args: {
    children: 'Nur für Screenreader sichtbarer Text',
  },
} satisfies Meta<typeof VisuallyHidden>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  render: (args) => (
    <p>
      Sichtbarer Text <VisuallyHidden {...args} /> (der Text danach ist unsichtbar, aber für
      Screenreader vorhanden).
    </p>
  ),
}
