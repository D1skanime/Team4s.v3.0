import type { Meta, StoryObj } from '@storybook/nextjs'

import { DesignTokensShowcase } from './DesignTokensShowcase'

/**
 * Design-Tokens- und Farbfamilien-Vorschau, gruppiert nach Token-Familie.
 */
const meta = {
  title: 'Im Einsatz/Design-Tokens und Farbfamilien',
  component: DesignTokensShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof DesignTokensShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
