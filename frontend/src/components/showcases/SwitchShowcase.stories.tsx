import type { Meta, StoryObj } from '@storybook/nextjs'

import { SwitchShowcase } from './SwitchShowcase'

/**
 * Komposition
 * (drei Switch-Beispiele inkl. gesperrtem Zustand) — keine neuen Zustands-Varianten
 * gegenüber der ursprünglichen Seite erfunden.
 */
const meta = {
  title: 'Im Einsatz/Switch-Beispiele',
  component: SwitchShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof SwitchShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
