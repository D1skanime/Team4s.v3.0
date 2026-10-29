import type { Meta, StoryObj } from '@storybook/nextjs'

import { AccordionShowcase } from './AccordionShowcase'

/**
 * 1:1 aus der früheren In-App-Showcase-Route migrierte Komposition
 * (Accordion + AvatarStack mit Mockdaten einer Rollen-Capability-Übersicht) — keine
 * neuen Zustands-Varianten gegenüber der ursprünglichen Seite erfunden.
 */
const meta = {
  title: 'Showcases/AccordionShowcase',
  component: AccordionShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof AccordionShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
