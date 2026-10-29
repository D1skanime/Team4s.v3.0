import type { Meta, StoryObj } from '@storybook/nextjs'

import { FormField } from './FormField'
import { Input } from './Input'

/** Beschriftungs-/Hinweis-/Fehler-Hülle für ein einzelnes Formularfeld. */
const meta = {
  title: 'UI/FormField',
  component: FormField,
  tags: ['autodocs'],
  // `children` ist bei FormField ein Pflichtprop; jede Story liefert ihr eigenes
  // Eingabefeld über `render` und überschreibt diesen Platzhalter zur Laufzeit.
  args: { children: null },
} satisfies Meta<typeof FormField>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    label: 'Titel',
    htmlFor: 'form-field-standard',
    hint: 'Knappe, klare Primärinformation.',
  },
  render: (args) => (
    <FormField {...args}>
      <Input id="form-field-standard" placeholder="Tokyo Night Stories" />
    </FormField>
  ),
}

export const MitFehler: Story = {
  name: 'MitFehler',
  args: {
    label: 'Beschreibung',
    htmlFor: 'form-field-error',
    error: 'Beispiel für einen validierten Zustand.',
  },
  render: (args) => (
    <FormField {...args}>
      <Input id="form-field-error" invalid defaultValue="Die Oberfläche bleibt mockbasiert und generisch." />
    </FormField>
  ),
}

export const Pflichtfeld: Story = {
  name: 'Pflichtfeld',
  args: {
    label: 'Status',
    htmlFor: 'form-field-required',
    required: true,
  },
  render: (args) => (
    <FormField {...args}>
      <Input id="form-field-required" placeholder="Pflichtangabe" />
    </FormField>
  ),
}

export const Disabled: Story = {
  args: {
    label: 'Gesperrtes Feld',
    htmlFor: 'form-field-disabled',
    disabled: true,
  },
  render: (args) => (
    <FormField {...args}>
      <Input id="form-field-disabled" disabled defaultValue="Nicht editierbar" />
    </FormField>
  ),
}
