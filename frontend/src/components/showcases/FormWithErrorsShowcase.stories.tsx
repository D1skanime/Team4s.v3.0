import type { Meta, StoryObj } from '@storybook/nextjs'

import { FormWithErrorsShowcase } from './FormWithErrorsShowcase'

/**
 * Formular mit mehreren gleichzeitig automatisch verknüpften Fehlerzuständen (Input, Select,
 * Textarea) -- nutzt die FormField-Autoverknüpfung aus Befund 5 sichtbar an mehr als einem
 * Feldtyp gleichzeitig.
 */
const meta = {
  title: 'Im Einsatz/FormWithErrorsShowcase',
  component: FormWithErrorsShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof FormWithErrorsShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
