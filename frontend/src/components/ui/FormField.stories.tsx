import type { Meta, StoryObj } from '@storybook/nextjs'

import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'
import { Textarea } from './Textarea'

const meta = {
  title: 'Zusammengesetzte Bausteine/FormField',
  component: FormField,
  tags: ['autodocs'],
  // `children` ist bei FormField ein Pflichtprop; jede Story liefert ihr eigenes
  // Eingabefeld über `render` und überschreibt diesen Platzhalter zur Laufzeit.
  args: { children: null },
  parameters: {
    docs: {
      description: {
        component:
          'Beschriftungs-/Hinweis-/Fehler-Hülle für ein einzelnes Formularfeld. Besteht aus: Input, ' +
          'Select, Textarea, DatePicker, YearPicker oder Switch als umschlossenes Feld.',
      },
    },
  },
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

export const AutomatischVerknuepfterFehler: Story = {
  name: 'AutomatischVerknuepfterFehler',
  args: {
    label: 'Anime-Titel',
    error: 'Titel ist bereits vergeben.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Nur `error` ist am FormField gesetzt, NICHT `invalid` am Input -- id, aria-invalid und ' +
          'aria-describedby kommen jetzt automatisch vom FormField. Ein Aufrufer muss sie nicht mehr ' +
          'manuell am Kind setzen oder mit `htmlFor` verknüpfen (CONTEXT.md Befund 5).',
      },
    },
  },
  render: (args) => (
    <FormField {...args}>
      <Input placeholder="z. B. Naruto" />
    </FormField>
  ),
}

export const AutomatischVerknuepftesDisabled: Story = {
  name: 'AutomatischVerknuepftesDisabled',
  args: {
    label: 'Gesperrtes Feld (automatisch)',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Nur `disabled` ist am FormField gesetzt -- das Kind bekommt `disabled` automatisch per ' +
          'ODER-Verknüpfung, ohne dass der Aufrufer es am Input selbst wiederholen muss.',
      },
    },
  },
  render: (args) => (
    <FormField {...args}>
      <Input defaultValue="Nicht editierbar" />
    </FormField>
  ),
}

export const AutomatischVerknuepftesSelect: Story = {
  name: 'AutomatischVerknuepftesSelect',
  args: {
    label: 'Status',
    error: 'Bitte einen Status wählen.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Die Autoverknüpfung aus Befund 5 gilt für alle sechs bekannten Feldtypen, nicht nur Input.',
      },
    },
  },
  render: (args) => (
    <FormField {...args}>
      <Select>
        <option value="">-- auswählen --</option>
        <option value="disabled">Deaktiviert</option>
        <option value="public">Öffentlich</option>
      </Select>
    </FormField>
  ),
}

export const AutomatischVerknuepfteTextarea: Story = {
  name: 'AutomatischVerknuepfteTextarea',
  args: {
    label: 'Beschreibung',
    hint: 'Kurzer Fließtext zum Anime.',
    error: 'Mindestens 20 Zeichen erforderlich.',
  },
  render: (args) => (
    <FormField {...args}>
      <Textarea placeholder="Beschreibung eingeben" />
    </FormField>
  ),
}
