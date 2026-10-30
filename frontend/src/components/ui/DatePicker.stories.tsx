import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { DatePicker } from './DatePicker'
import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'

/**
 * Datums-Auswahl-Primitive mit Tages-/Monats-/Jahres-Panel. Das Panel wird ausschließlich
 * über internen `useState` geöffnet (kein `open`-Prop in der öffentlichen API) — die Story
 * demonstriert daher den geschlossenen Standardzustand; das Panel selbst lässt sich nur per
 * echter Nutzerinteraktion (Klick auf den Auslöser-Button) öffnen, nicht über eine statische
 * Args-Variante.
 */
const meta = {
  title: 'Grundbausteine/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  // Alle Pflicht-Props liegen hier als Platzhalter vor; jede Story rendert stattdessen über
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

/**
 * Begrenzt die Story auf eine übliche Formularfeld-Breite statt der vollen Storybook-Fläche --
 * der Auslöser selbst ist bewusst `width: 100%` (identisch zu Input/Select), wirkt ohne
 * begrenzenden Container aber überdimensioniert (UAT-Runde 4, Befund 4, 2026-10-30).
 */
function FieldWidth({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 280 }}>{children}</div>
}

export const Standard: Story = {
  render: () => (
    <FieldWidth>
      <ControlledDatePicker id="date-picker-standard" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} />
    </FieldWidth>
  ),
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  render: () => (
    <FieldWidth>
      <ControlledDatePicker id="date-picker-disabled" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} disabled />
    </FieldWidth>
  ),
}

export const Invalid: Story = {
  name: 'Ungültig',
  render: () => (
    <FieldWidth>
      <ControlledDatePicker id="date-picker-invalid" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} invalid />
    </FieldWidth>
  ),
}

export const GeschlossenesPanel: Story = {
  name: 'Geschlossenes Panel',
  render: () => (
    <FieldWidth>
      <ControlledDatePicker id="date-picker-closed" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} />
    </FieldWidth>
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

export const InFormField: Story = {
  name: 'In FormField',
  render: () => (
    <FieldWidth>
      <FormField label="Veröffentlichungsdatum" htmlFor="date-picker-formfield" hint="Datum der Erstveröffentlichung.">
        <ControlledDatePicker id="date-picker-formfield" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} />
      </FormField>
    </FieldWidth>
  ),
}

export const ImEinsatz: Story = {
  name: 'Im Einsatz neben Input und Select',
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 280 }}>
      <FormField label="Gruppenname" htmlFor="date-picker-showcase-input">
        <Input id="date-picker-showcase-input" placeholder="z. B. C-Subs" />
      </FormField>
      <FormField label="Status" htmlFor="date-picker-showcase-select">
        <Select id="date-picker-showcase-select" defaultValue="active">
          <option value="active">Aktiv</option>
          <option value="paused">Pausiert</option>
        </Select>
      </FormField>
      <FormField label="Veröffentlichungsdatum">
        <ControlledDatePicker id="date-picker-showcase-date" label="Veröffentlichungsdatum" minYear={1990} maxYear={2030} />
      </FormField>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Zeigt, dass der Auslöser neben Input/Select optisch denselben Feld-Stil nutzt (UAT-Runde 4, Befund 4).',
      },
    },
  },
}
