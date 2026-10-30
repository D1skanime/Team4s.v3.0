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
