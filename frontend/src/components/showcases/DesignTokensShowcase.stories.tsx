import type { Meta, StoryObj } from '@storybook/nextjs'

import { DesignTokensShowcase } from './DesignTokensShowcase'

/**
 * Neue, eigenständige Komponente für die vormals nur inline im Seitencode der
 * früheren In-App-Showcase-Route vorhandene Design-Tokens- und Farbfamilien-Vorschau.
 */
const meta = {
  title: 'Im Einsatz/DesignTokensShowcase',
  component: DesignTokensShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof DesignTokensShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
