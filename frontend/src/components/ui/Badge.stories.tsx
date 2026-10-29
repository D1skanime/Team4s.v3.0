import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'

/** Status-Badge-Primitive: alle sechs Varianten, bewusst unauffällig statt laut. */
const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {
  args: { variant: 'neutral', children: 'Neutral' },
}

export const Success: Story = {
  args: { variant: 'success', children: 'Success' },
}

export const Warning: Story = {
  args: { variant: 'warning', children: 'Warning' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Danger' },
}

export const Info: Story = {
  args: { variant: 'info', children: 'Info' },
}

export const Muted: Story = {
  args: { variant: 'muted', children: 'Muted' },
}
