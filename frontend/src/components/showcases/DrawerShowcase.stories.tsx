import type { Meta, StoryObj } from '@storybook/nextjs'

import { DrawerShowcase } from './DrawerShowcase'

/**
 * 1:1 aus der früheren In-App-Showcase-Route migrierte Komposition
 * (Release-Details-Drawer mit Größen-Umschalter und Tabs) — keine neuen
 * Zustands-Varianten gegenüber der ursprünglichen Seite erfunden.
 */
const meta = {
  title: 'Im Einsatz/DrawerShowcase',
  component: DrawerShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof DrawerShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: { open: true, onClose: () => {} },
}
