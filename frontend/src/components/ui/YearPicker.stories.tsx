import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'
import { YearPicker } from './YearPicker'

/** Kompakte Jahres-Auswahl-Primitive (z. B. für Gründungsjahr/Erscheinungsjahr). */
const meta = {
  title: 'Zusammengesetzte Bausteine/YearPicker',
  component: YearPicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: IconButton, NavArrow.',
      },
    },
  },
  // Alle Pflicht-Props liegen hier als Platzhalter vor; jede Story rendert stattdessen über
  // `ControlledYearPicker` mit eigenem useState-Wert und ignoriert diese Default-Args.
  args: {
    id: 'year-picker-meta-default',
    label: 'Jahr',
    value: '',
    minYear: 1980,
    maxYear: 2030,
    onChange: () => {},
  },
} satisfies Meta<typeof YearPicker>

export default meta
type Story = StoryObj<typeof meta>

function ControlledYearPicker(props: Omit<ComponentProps<typeof YearPicker>, 'value' | 'onChange'>) {
  const [value, setValue] = useState('2002')
  return <YearPicker {...props} value={value} onChange={setValue} />
}

/**
 * Begrenzt die Story auf eine übliche Formularfeld-Breite statt der vollen Storybook-Fläche --
 * der Trigger selbst ist bewusst `width: 100%` (identisch zu Input/Select), wirkt ohne
 * begrenzenden Container aber überdimensioniert (UAT-Runde 4, Befund 4, 2026-10-30).
 */
function FieldWidth({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 280 }}>{children}</div>
}

export const Standard: Story = {
  render: () => (
    <FieldWidth>
      <ControlledYearPicker id="year-picker-standard" label="Gründungsjahr" minYear={1980} maxYear={2030} />
    </FieldWidth>
  ),
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  render: () => (
    <FieldWidth>
      <ControlledYearPicker id="year-picker-disabled" label="Gründungsjahr" minYear={1980} maxYear={2030} disabled />
    </FieldWidth>
  ),
}

export const Invalid: Story = {
  name: 'Ungültig',
  render: () => (
    <FieldWidth>
      <ControlledYearPicker id="year-picker-invalid" label="Gründungsjahr" minYear={1980} maxYear={2030} invalid />
    </FieldWidth>
  ),
}

export const InFormField: Story = {
  name: 'In FormField',
  render: () => (
    <FieldWidth>
      <FormField label="Gründungsjahr" htmlFor="year-picker-formfield" hint="Jahr der Gründung, falls bekannt.">
        <ControlledYearPicker id="year-picker-formfield" label="Gründungsjahr" minYear={1980} maxYear={2030} />
      </FormField>
    </FieldWidth>
  ),
}

export const ImEinsatz: Story = {
  name: 'Im Einsatz neben Input und Select',
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 280 }}>
      <FormField label="Gruppenname" htmlFor="year-picker-showcase-input">
        <Input id="year-picker-showcase-input" placeholder="z. B. C-Subs" />
      </FormField>
      <FormField label="Status" htmlFor="year-picker-showcase-select">
        <Select id="year-picker-showcase-select" defaultValue="active">
          <option value="active">Aktiv</option>
          <option value="paused">Pausiert</option>
        </Select>
      </FormField>
      <FormField label="Gründungsjahr">
        <ControlledYearPicker id="year-picker-showcase-year" label="Gründungsjahr" minYear={1980} maxYear={2030} />
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
