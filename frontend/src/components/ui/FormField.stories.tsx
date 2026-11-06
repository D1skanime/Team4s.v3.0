import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { DatePicker } from './DatePicker'
import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'
import { Switch } from './Switch'
import { Textarea } from './Textarea'
import { YearPicker } from './YearPicker'

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
          'Beschriftungs-/Hinweis-/Fehler-Hülle für ein einzelnes Formularfeld. Besteht aus: ' +
          `${storybookDocsLink('Grundbausteine/Label', 'Label')}, ${storybookDocsLink('Grundbausteine/Text', 'Text')}, ` +
          `${storybookDocsLink('Grundbausteine/Input', 'Input')}, ${storybookDocsLink('Grundbausteine/Select', 'Select')}, ` +
          `${storybookDocsLink('Grundbausteine/Textarea', 'Textarea')}, ${storybookDocsLink('Zusammengesetzte Bausteine/DatePicker', 'DatePicker')}, ` +
          `${storybookDocsLink('Zusammengesetzte Bausteine/YearPicker', 'YearPicker')} oder ${storybookDocsLink('Grundbausteine/Switch', 'Switch')} als umschlossenes Feld.`,
      },
    },
  },
} satisfies Meta<typeof FormField>

export default meta
type Story = StoryObj<typeof meta>

/** Alle Stories ab hier nutzen ausschließlich das Auto-Verknüpfungs-Muster: nur FormField-Props
 *  (label/hint/error/required/disabled) setzen, kein manuelles htmlFor/id/invalid am Kind mehr --
 *  FormField verknüpft id/aria-invalid/aria-describedby/required selbst (siehe
 *  `AutomatischVerknuepft*`-Stories unten für den direkten Vorher/Nachher-Vergleich). */

export const Standard: Story = {
  args: {
    label: 'Titel',
    hint: 'Knappe, klare Primärinformation.',
  },
  render: (args) => (
    <FormField {...args}>
      <Input placeholder="Tokyo Night Stories" />
    </FormField>
  ),
}

export const MitFehler: Story = {
  name: 'Mit Fehler',
  args: {
    label: 'Beschreibung',
    error: 'Beispiel für einen validierten Zustand.',
  },
  render: (args) => (
    <FormField {...args}>
      <Input defaultValue="Die Oberfläche bleibt mockbasiert und generisch." />
    </FormField>
  ),
}

export const Pflichtfeld: Story = {
  name: 'Pflichtfeld',
  args: {
    label: 'Status',
    required: true,
  },
  render: (args) => (
    <FormField {...args}>
      <Input placeholder="Pflichtangabe" />
    </FormField>
  ),
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: {
    label: 'Gesperrtes Feld',
    disabled: true,
  },
  render: (args) => (
    <FormField {...args}>
      <Input defaultValue="Nicht editierbar" />
    </FormField>
  ),
}

export const AutomatischVerknuepfterFehler: Story = {
  name: 'Automatisch verknüpfter Fehler',
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
          'manuell am Kind setzen oder mit `htmlFor` verknüpfen.',
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
  name: 'Automatisch verknüpft: deaktiviert',
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
  name: 'Automatisch verknüpft: Auswahl',
  args: {
    label: 'Status',
    error: 'Bitte einen Status wählen.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Die Autoverknüpfung gilt für alle sechs bekannten Feldtypen, nicht nur Input.',
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
  name: 'Automatisch verknüpft: Textfeld',
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

function DatePickerDemo() {
  const [value, setValue] = useState('')
  return (
    <FormField label="Erscheinungsdatum" hint="Format TT.MM.JJJJ.">
      <DatePicker id="form-field-datepicker" label="Erscheinungsdatum" value={value} minYear={1960} maxYear={2030} onChange={setValue} />
    </FormField>
  )
}

export const AutomatischVerknuepfterDatePicker: Story = {
  name: 'Automatisch verknüpft: DatePicker',
  render: () => <DatePickerDemo />,
  parameters: {
    docs: {
      description: {
        story: 'FormField verknüpft den DatePicker-Trigger über aria-describedby (ohne aria-invalid, siehe FormField.tsx-Kommentar zur impliziten Button-Rolle).',
      },
    },
  },
}

function YearPickerDemo() {
  const [value, setValue] = useState('')
  return (
    <FormField label="Erschienen" error="Bitte ein Jahr wählen.">
      <YearPicker id="form-field-yearpicker" label="Erschienen" value={value} minYear={1960} maxYear={2030} onChange={setValue} />
    </FormField>
  )
}

export const AutomatischVerknuepfterYearPicker: Story = {
  name: 'Automatisch verknüpft: YearPicker',
  render: () => <YearPickerDemo />,
}

function SwitchDemo() {
  const [checked, setChecked] = useState(false)
  return (
    <FormField label="Benachrichtigungen" hint="Gilt nur für diesen Browser.">
      <Switch checked={checked} onCheckedChange={setChecked} />
    </FormField>
  )
}

export const AutomatischVerknuepfterSwitch: Story = {
  name: 'Automatisch verknüpft: Switch',
  render: () => <SwitchDemo />,
  parameters: {
    docs: {
      description: {
        story: 'FormField verknüpft den Switch über id/aria-describedby; aria-invalid kommt ausschließlich aus FormField.error, da Switch kein eigenes invalid-Konzept kennt.',
      },
    },
  },
}

/** Drei gleichzeitig fehlerhafte Felder (Titel/Status/Beschreibung) -- bei JEDEM Feld ist NUR
 *  `error` am FormField gesetzt, ohne manuelles `invalid` am umschlossenen Input/Select/Textarea.
 *  Zeigt sichtbar, dass die automatische id-/aria-invalid-/aria-describedby-Verknüpfung greift,
 *  ohne dass der Aufrufer sie am Feld selbst wiederholen muss. */
export const MehrereFehlerGleichzeitig: Story = {
  name: 'Mehrere Fehler gleichzeitig',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FormField label="Titel" error="Titel ist bereits vergeben.">
        <Input placeholder="z. B. Naruto" />
      </FormField>
      <FormField label="Status" error="Bitte einen Status wählen.">
        <Select>
          <option value="">-- auswählen --</option>
          <option value="public">Öffentlich</option>
          <option value="private">Privat</option>
        </Select>
      </FormField>
      <FormField label="Beschreibung" error="Mindestens 20 Zeichen erforderlich.">
        <Textarea placeholder="Beschreibung eingeben" />
      </FormField>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Die Fehlerverknüpfung (id, aria-invalid, aria-describedby) erfolgt automatisch durch FormField, sobald nur `error` gesetzt wird -- auch wenn mehrere Felder einer Seite gleichzeitig einen Fehler zeigen.',
      },
    },
  },
}
