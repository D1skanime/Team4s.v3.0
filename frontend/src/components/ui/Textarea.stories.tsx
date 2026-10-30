import type { Meta, StoryObj } from '@storybook/nextjs'

import { Textarea } from './Textarea'

/** Mehrzeiliges Freitextfeld-Primitive: Standard-, Fehler-, Disabled- und Lang-Inhalt-Zustand. */
const meta = {
  title: 'Grundbausteine/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    rows: 4,
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { placeholder: 'Beschreibung zu diesem Bild' },
}

export const Invalid: Story = {
  name: 'Ungültig',
  args: { invalid: true, defaultValue: 'Die Oberfläche bleibt mockbasiert und generisch.' },
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: { disabled: true, defaultValue: 'Gesperrtes Feld' },
}

export const LangerInhalt: Story = {
  name: 'Langer Inhalt',
  args: {
    defaultValue:
      'Die Oberfläche bleibt mockbasiert und generisch. Dieser Absatz ist bewusst sehr lang, über mehrere Zeilen hinweg, um das Zeilenumbruch- und Scroll-Verhalten eines mehrzeiligen Textfelds mit realistisch langem Fließtext zu prüfen, ohne dass dabei der Rahmen des Feldes gesprengt wird.',
  },
}
