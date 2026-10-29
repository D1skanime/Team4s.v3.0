import type { Meta, StoryObj } from '@storybook/nextjs'

import { DesignTokensShowcase } from './DesignTokensShowcase'

/**
 * Neue, eigenständige Komponente für die vormals nur inline im Seitencode von
 * `/dev/ui-system` vorhandene Design-Tokens- und Farbfamilien-Vorschau.
 */
const meta = {
  title: 'Showcases/DesignTokensShowcase',
  component: DesignTokensShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof DesignTokensShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
