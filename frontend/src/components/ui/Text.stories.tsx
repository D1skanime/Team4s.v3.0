import type { Meta, StoryObj } from '@storybook/nextjs'

import { Text } from './Text'

/** Typografie-Grundbaustein fuer Fliess-/Metatext mit vier Tonalitaetsstufen. */
const meta = {
  title: 'Grundbausteine/Text',
  component: Text,
  tags: ['autodocs'],
} satisfies Meta<typeof Text>

export default meta
type Story = StoryObj<typeof meta>

export const Body: Story = {
  args: { variant: 'body', children: 'Normaler Fließtext für Beschreibungen und Inhalte.' },
}

export const Soft: Story = {
  args: { variant: 'soft', children: 'Leiser getönter Text, etwa für Sektions-Unterzeilen.' },
}

export const MetaVariant: Story = {
  name: 'Meta',
  args: { variant: 'meta', children: 'Kompakter Metatext, etwa für Seiten-Unterzeilen.' },
}

export const Small: Story = {
  args: { variant: 'small', children: 'Kleiner, zurückhaltender Hinweistext.' },
}
