import { useState } from 'react'
import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { YearPicker } from './YearPicker'

/** Kompakte Jahres-Auswahl-Primitive (z. B. für Gründungsjahr/Erscheinungsjahr). */
const meta = {
  title: 'UI/YearPicker',
  component: YearPicker,
  tags: ['autodocs'],
  // Alle Pflicht-Props liegen hier als Platzhalter vor; jede Story rendert stattdessen ueber
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

export const Standard: Story = {
  render: () => <ControlledYearPicker id="year-picker-standard" label="Gründungsjahr" minYear={1980} maxYear={2030} />,
}

export const Disabled: Story = {
  render: () => (
    <ControlledYearPicker id="year-picker-disabled" label="Gründungsjahr" minYear={1980} maxYear={2030} disabled />
  ),
}

export const Invalid: Story = {
  render: () => (
    <ControlledYearPicker id="year-picker-invalid" label="Gründungsjahr" minYear={1980} maxYear={2030} invalid />
  ),
}
