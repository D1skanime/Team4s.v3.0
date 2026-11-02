import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { Switch } from './Switch'

/** Toggle-Primitive mit `role="switch"` und korrekten ARIA-Attributen. */
const meta = {
  title: 'Grundbausteine/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: {
    onCheckedChange: () => {},
    label: 'Benachrichtigungen aktiviert',
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const An: Story = {
  args: { checked: true },
}

export const Aus: Story = {
  args: { checked: false },
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: { checked: false, disabled: true, label: 'Gesperrte Option' },
}

/** Mehrere Switches gleichzeitig (aktiv/inaktiv/gesperrt) in einem einfachen Stack -- KEINE
 *  `Card`-Einbindung (Card ist ein eigener katalogisierter Baustein; ein Grundbaustein bleibt
 *  frei von sichtbar komponierten Fremd-Bausteinen). Kein `aria-label`: der sichtbare `label`-Text
 *  liefert über `Switch.tsx`s `<span className={styles.switchLabel}>{label}</span>` bereits den
 *  Accessible Name -- ein davon abweichendes `aria-label` wäre ein WCAG-2.5.3-Verstoß
 *  (Name-Verfügbarkeit: der sichtbare Text muss Teil des Accessible Name sein). */
export const MehrereSchalter: Story = {
  name: 'Mehrere Schalter',
  args: { checked: false },
  render: () => {
    function MultiSwitchDemo() {
      const [benachrichtigungen, setBenachrichtigungen] = useState(true)
      const [sichtbar, setSichtbar] = useState(false)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Switch checked={benachrichtigungen} onCheckedChange={setBenachrichtigungen} label="Benachrichtigungen aktiviert" />
          <Switch checked={sichtbar} onCheckedChange={setSichtbar} label="Öffentlich sichtbar" />
          <Switch checked={false} onCheckedChange={() => {}} label="Gesperrte Option" disabled />
        </div>
      )
    }
    return <MultiSwitchDemo />
  },
}
