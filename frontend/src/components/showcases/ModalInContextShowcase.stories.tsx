import type { Meta, StoryObj } from '@storybook/nextjs'

import { ModalInContextShowcase } from './ModalInContextShowcase'

/**
 * Vollständiges Modal über einer realistischen Mock-Seite: Titelzeile, Formular mit
 * FormField+Input/Select, Trennstriche und Footer-Buttons -- demonstriert die
 * Modal/DialogHeader/IconButton-Komposition im Seitenkontext statt isoliert.
 */
const meta = {
  title: 'Im Einsatz/ModalInContextShowcase',
  component: ModalInContextShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof ModalInContextShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
