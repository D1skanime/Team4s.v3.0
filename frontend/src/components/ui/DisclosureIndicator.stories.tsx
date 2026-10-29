import type { Meta, StoryObj } from '@storybook/nextjs'

import { DisclosureIndicator } from './DisclosureIndicator'

/** Öffner-Symbol-Primitive für aufklappbare Zeilen/Listen/Karten. */
const meta = {
  title: 'Grundbausteine/DisclosureIndicator',
  component: DisclosureIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof DisclosureIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Geschlossen: Story = {
  name: 'Geschlossen',
  args: { size: 'sm' },
}

export const Geoeffnet: Story = {
  name: 'Geoeffnet',
  args: { open: true },
}

export const Prominent: Story = {
  name: 'Prominent',
  args: { open: true, size: 'lg', variant: 'button' },
}
