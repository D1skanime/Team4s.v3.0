import { useState } from 'react'
import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { DatePicker } from './DatePicker'

/**
 * Datums-Auswahl-Primitive mit Tages-/Monats-/Jahres-Panel. Das Panel wird ausschließlich
 * über internen `useState` geöffnet (kein `open`-Prop in der öffentlichen API) — die Story
 * demonstriert daher den geschlossenen Standardzustand; das Panel selbst lässt sich nur per
 * echter Nutzerinteraktion (Klick auf den Auslöser-Button) öffnen, nicht über eine statische
 * Args-Variante.
 */
const meta = {
  title: 'UI/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  // Alle Pflicht-Props liegen hier als Platzhalter vor; jede Story rendert stattdessen ueber
  // `ControlledDatePicker` mit eigenem useState-Wert und ignoriert diese Default-Args.
  args: {
    id: 'date-picker-meta-default',
    label: 'Datum',
    value: '',
    minYear: 1990,
    maxYear: 2030,
    onChange: () => {},
  },
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

function ControlledDatePicker(props: Omit<ComponentProps<typeof DatePicker>, 'value' | 'onChange'>) {
  const [value, setValue] = useState('2026-07-15')
  return <DatePicker {...props} value={value} onChange={setValue} />
}

export const Standard: Story = {
  render: () => (
    <ControlledDatePicker id="date-picker-standard" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} />
  ),
}

export const Disabled: Story = {
  render: () => (
    <ControlledDatePicker id="date-picker-disabled" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} disabled />
  ),
}

export const Invalid: Story = {
  render: () => (
    <ControlledDatePicker id="date-picker-invalid" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} invalid />
  ),
}

export const GeschlossenesPanel: Story = {
  name: 'GeschlossenesPanel',
  render: () => (
    <ControlledDatePicker id="date-picker-closed" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Der Auslöser-Button zeigt den Standardzustand mit vorbefülltem Wert. Das Kalender-Panel selbst öffnet nur per echtem Klick (kein `open`-Prop vorhanden) — im Storybook-Canvas auf den Button klicken, um das Panel live zu sehen.',
      },
    },
  },
}
