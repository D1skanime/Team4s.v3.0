import type { Meta, StoryObj } from '@storybook/nextjs'

import { Switch } from './Switch'

/** Toggle-Primitive mit `role="switch"` und korrekten ARIA-Attributen. */
const meta = {
  title: 'Grundbausteine/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: {
    onCheckedChange: () => {},
    label: 'Benachrichtigungen aktiviert',
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const An: Story = {
  args: { checked: true },
}

export const Aus: Story = {
  args: { checked: false },
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: { checked: false, disabled: true, label: 'Gesperrte Option' },
}
