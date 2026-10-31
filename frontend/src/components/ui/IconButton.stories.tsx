import type { Meta, StoryObj } from '@storybook/nextjs'
import { ChevronRight, X } from 'lucide-react'

import { IconButton } from './IconButton'

/**
 * Knopf, der nur ein Symbol zeigt, mit erzwungener Beschriftung für Screenreader. Bietet eigene
 * Optionen für Form, Größe, Farbvariante und Ton an, statt dass Aufrufer seine Optik von außen
 * überschreiben müssen.
 */
const meta = {
  title: 'Grundbausteine/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    icon: <X size={18} />,
    'aria-label': 'Schließen',
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Dezent: Story = {
  args: { variant: 'ghost' },
}

export const Akzent: Story = {
  name: 'Akzent',
  args: { icon: '+3', 'aria-label': '3 weitere anzeigen', variant: 'accent', shape: 'round' },
  parameters: {
    docs: {
      description: {
        story: 'Gefüllte, akzentfarbene Fläche für einen klickbaren Zähler-/Überlauf-Knopf, z. B. AvatarStacks "+N weitere".',
      },
    },
  },
}

export const AufBild: Story = {
  name: 'Auf Bild',
  args: { variant: 'onImage' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 160, height: 120, background: 'var(--text-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
}

export const Rund: Story = {
  args: { shape: 'round' },
}

export const PfeilTon: Story = {
  name: 'Pfeil-Ton',
  args: { icon: <ChevronRight size={18} />, 'aria-label': 'Weiter', tone: 'arrow', shape: 'round' },
}

export const Schwebend: Story = {
  name: 'Schwebend (Ecke)',
  args: { floating: true, variant: 'onImage' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 160, height: 120, background: 'var(--text-strong)' }}>
        <Story />
      </div>
    ),
  ],
}

export const Klein: Story = {
  args: { size: 'sm' },
}

export const Gross: Story = {
  name: 'Groß',
  args: { size: 'lg' },
}

export const Deaktiviert: Story = {
  args: { disabled: true },
}

export const FeldAusloeser: Story = {
  name: 'Feld-Auslöser',
  args: {
    icon: <>Wert <ChevronRight size={16} aria-hidden="true" /></>,
    'aria-label': 'Datum auswählen',
    variant: 'field',
    size: 'fill',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', alignItems: 'center', width: 220, padding: '0 12px', minHeight: 44, border: '1px solid var(--field-border-color)', borderRadius: 'var(--field-radius)', background: 'var(--field-bg)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Basis für DatePickers Auslöser: kein eigener Rahmen/Hintergrund -- die umgebende Feld-Zeile liefert die Optik, size="fill" streckt den Button auf die volle Zeilenbreite.',
      },
    },
  },
}

export const Auswahlkachel: Story = {
  name: 'Auswahlkachel',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 44px)', gap: 8 }}>
      {[1, 2, 3, 4].map((day) => (
        <IconButton
          key={day}
          icon={day}
          aria-label={String(day)}
          variant="tile"
          size="fill"
          aria-current={day === 3 ? 'true' : undefined}
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Basis für Tages-/Monats-/Jahres-Kacheln eines Pickers: transparent, füllt die Rasterzelle (size="fill"), "ausgewählt" (Kachel 3) über aria-current -- derselbe Mechanismus wie bei Button, ohne externen Spezifitäts-Trick.',
      },
    },
  },
}

const VARIANTS = ['default', 'ghost', 'onImage'] as const
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  default: 'Standard',
  ghost: 'Dezent',
  onImage: 'Auf Bild',
}
const SIZES = ['sm', 'md', 'lg'] as const

export const GroessenUndVarianten: Story = {
  name: 'Größen und Varianten',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
      {VARIANTS.flatMap((variant) =>
        SIZES.map((size) => (
          <div
            key={`${variant}-${size}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: 8,
              background: variant === 'onImage' ? 'var(--text-strong)' : 'transparent',
            }}
          >
            <IconButton icon={<X size={18} />} aria-label="Schließen" variant={variant} size={size} />
            <span style={{ fontSize: 12, color: variant === 'onImage' ? '#fff' : 'var(--text-soft)' }}>
              {VARIANT_LABELS[variant]} / {size}
            </span>
          </div>
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
