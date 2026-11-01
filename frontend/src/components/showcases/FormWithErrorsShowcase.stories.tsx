import type { Meta, StoryObj } from '@storybook/nextjs'

import { FormWithErrorsShowcase } from './FormWithErrorsShowcase'

/**
 * Formular mit mehreren gleichzeitig automatisch verknüpften Fehlerzuständen (Input, Select,
 * Textarea) -- zeigt FormFields automatische Fehler-Verknüpfung sichtbar an mehr als einem
 * Feldtyp gleichzeitig.
 */
const meta = {
  title: 'Im Einsatz/Formular mit mehreren Fehlern',
  component: FormWithErrorsShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof FormWithErrorsShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
