import type { Meta, StoryObj } from '@storybook/nextjs'

import { Input } from './Input'

/** Freitext-Eingabefeld-Primitive: Standard-, Fehler-, Disabled- und Lang-Wert-Zustand. */
const meta = {
  title: 'Grundbausteine/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Tokyo Night Stories',
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Invalid: Story = {
  args: { invalid: true, defaultValue: 'Ungültiger Wert' },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Gesperrt' },
}

export const LangerWert: Story = {
  name: 'LangerWert',
  args: {
    defaultValue:
      'Ein sehr langer vorbefüllter Eingabewert, der das Overflow- und Scroll-Verhalten innerhalb des Eingabefelds prüft',
  },
}
