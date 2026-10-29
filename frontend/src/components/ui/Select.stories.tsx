import type { Meta, StoryObj } from '@storybook/nextjs'

import { Select } from './Select'

/** Auswahlfeld-Primitive: Standard mit drei Optionen, Fehler-, Disabled- und Leer-Optionen-Zustand. */
const meta = {
  title: 'Grundbausteine/Select',
  component: Select,
  tags: ['autodocs'],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { defaultValue: 'ongoing' },
  render: (args) => (
    <Select {...args}>
      <option value="ongoing">Aktiv</option>
      <option value="paused">Pausiert</option>
      <option value="archived">Archiviert</option>
    </Select>
  ),
}

export const Invalid: Story = {
  name: 'Ungültig',
  args: { invalid: true, defaultValue: 'ongoing' },
  render: (args) => (
    <Select {...args}>
      <option value="ongoing">Aktiv</option>
      <option value="paused">Pausiert</option>
      <option value="archived">Archiviert</option>
    </Select>
  ),
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: { disabled: true, defaultValue: 'ongoing' },
  render: (args) => (
    <Select {...args}>
      <option value="ongoing">Aktiv</option>
      <option value="paused">Pausiert</option>
      <option value="archived">Archiviert</option>
    </Select>
  ),
}

export const LeereOptionen: Story = {
  name: 'LeereOptionen',
  render: (args) => (
    <Select {...args}>
      <option value="">Keine Optionen verfügbar</option>
    </Select>
  ),
}
