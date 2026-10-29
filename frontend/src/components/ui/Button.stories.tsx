import type { Meta, StoryObj } from '@storybook/nextjs'
import { MoreHorizontal } from 'lucide-react'

import { Button } from './Button'

/**
 * Referenz-Story für das Button-Primitive: deckt alle Varianten ab, die vormals in der
 * In-App-Showcase-Route sichtbar waren (Primary/Secondary/Ghost/Subtle/Danger/
 * Success/IconOnly/Loading/Disabled/Small/Large), ergänzt um einen Lang-Text- und einen
 * Fokus-Prüfhinweis. Dient zugleich als früher empirischer Beleg dafür, dass CSS-Module
 * unter dem `@storybook/nextjs`-Webpack-Adapter ohne Zusatzkonfiguration greifen.
 */
const meta = {
  title: 'Grundbausteine/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Primär',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primaer: Story = {
  name: 'Primär',
  args: { children: 'Primär' },
}

export const Sekundaer: Story = {
  name: 'Sekundär',
  args: { variant: 'secondary', children: 'Sekundär' },
}

export const Dezent: Story = {
  name: 'Dezent',
  args: { variant: 'ghost', children: 'Dezent' },
}

export const Zurueckhaltend: Story = {
  name: 'Zurückhaltend',
  args: { variant: 'subtle', children: 'Zurückhaltend' },
}

export const Gefahr: Story = {
  name: 'Gefahr',
  args: { variant: 'danger', children: 'Gefahr' },
}

export const Erfolg: Story = {
  name: 'Erfolg',
  args: { variant: 'success', children: 'Speichern' },
}

export const NurSymbol: Story = {
  name: 'Nur Symbol',
  args: {
    iconOnly: true,
    'aria-label': 'Mehr Optionen',
    children: <MoreHorizontal size={16} />,
  },
}

export const Laedt: Story = {
  name: 'Lädt',
  args: { loading: true, children: 'Lädt' },
}

export const Deaktiviert: Story = {
  name: 'Deaktiviert',
  args: { disabled: true, children: 'Deaktiviert' },
}

export const Klein: Story = {
  name: 'Klein',
  args: { size: 'sm', children: 'Klein' },
}

export const Gross: Story = {
  name: 'Groß',
  args: { size: 'lg', children: 'Groß' },
}

export const LangerLabelText: Story = {
  name: 'Langer Label-Text',
  args: {
    children: 'Dieser Button-Text ist absichtlich sehr lang, um Umbruch- und Overflow-Verhalten innerhalb der Button-Fläche zu prüfen',
  },
}

export const FokusSichtbar: Story = {
  name: 'Fokus sichtbar',
  args: { children: 'Primär' },
  parameters: {
    docs: {
      description: {
        story:
          'Standard-Button zur Fokus-Prüfung: Tab-Taste drücken, um den sichtbaren Fokusring zu sehen. Das `addon-a11y`-Panel dieser Story zeigt zusätzlich automatisierte Kontrast-/Fokus-Hinweise.',
      },
    },
  },
}

const VARIANTS = ['primary', 'secondary', 'ghost', 'subtle', 'danger', 'success', 'text', 'floating'] as const
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  primary: 'Primär',
  secondary: 'Sekundär',
  ghost: 'Dezent',
  subtle: 'Zurückhaltend',
  danger: 'Gefahr',
  success: 'Erfolg',
  text: 'Text',
  floating: 'Schwebend',
}
const SIZES = ['sm', 'md', 'lg'] as const

export const GroessenUndVarianten: Story = {
  name: 'Größen und Varianten',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {VARIANTS.flatMap((variant) =>
        SIZES.map((size) => (
          <Button key={`${variant}-${size}`} variant={variant} size={size}>
            {VARIANT_LABELS[variant]} / {size}
          </Button>
        )),
      )}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alle Varianten-/Größen-Kombinationen auf einen Blick vergleichen.' },
    },
  },
}
