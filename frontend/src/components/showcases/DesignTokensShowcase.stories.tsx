import type { Meta, StoryObj } from '@storybook/nextjs'

import { DesignTokensShowcase } from './DesignTokensShowcase'

/**
 * Automatisch aus globals.css ausgelesener, vollständiger Design-Token-Katalog -- keine von Hand
 * gepflegte Teilliste. Unter "Grundlagen" statt "Im Einsatz" einsortiert: zeigt die Rohdaten des
 * Design-Systems selbst, keine domänenspezifische Komposition.
 */
const meta = {
  title: 'Grundlagen/Design-Tokens',
  component: DesignTokensShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof DesignTokensShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
