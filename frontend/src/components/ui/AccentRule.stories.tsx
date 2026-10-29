import type { Meta, StoryObj } from '@storybook/nextjs'

import { AccentRule } from './AccentRule'

/** Dekorative Wein-/Akzentlinie in vier Dicken. */
const meta = {
  title: 'UI/AccentRule',
  component: AccentRule,
  tags: ['autodocs'],
} satisfies Meta<typeof AccentRule>

export default meta
type Story = StoryObj<typeof meta>

export const Hairline: Story = {
  args: { thickness: 'hairline' },
}

export const Standard: Story = {
  args: {},
}

export const Medium: Story = {
  args: { thickness: 'medium' },
}

export const Strong: Story = {
  args: { thickness: 'strong' },
}
