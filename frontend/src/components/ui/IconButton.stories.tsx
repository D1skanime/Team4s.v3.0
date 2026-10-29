import type { Meta, StoryObj } from '@storybook/nextjs'
import { X } from 'lucide-react'

import { IconButton } from './IconButton'

/**
 * Grundbaustein für Icon-only-Buttons mit erzwungenem `aria-label`. Konsolidiert die vormals
 * zufällig identischen `.closeButton`/`.closeButtonFloating`-Rezepte aus Modal/`ui.module.css`
 * in ein einziges, wiederverwendbares Rezept.
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

export const Ghost: Story = {
  name: 'Dezent',
  args: { variant: 'ghost' },
}

export const Floating: Story = {
  name: 'Schwebend',
  args: { variant: 'floating' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 160, height: 120, border: '1px dashed var(--border-subtle)' }}>
        <Story />
      </div>
    ),
  ],
}

export const Klein: Story = {
  name: 'Klein',
  args: { size: 'sm' },
}

export const Gross: Story = {
  name: 'Groß',
  args: { size: 'lg' },
}

export const Deaktiviert: Story = {
  name: 'Deaktiviert',
  args: { disabled: true },
}

const VARIANTS = ['default', 'floating', 'ghost'] as const
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  default: 'Standard',
  floating: 'Schwebend',
  ghost: 'Dezent',
}
const SIZES = ['sm', 'md', 'lg'] as const

export const GroessenUndVarianten: Story = {
  name: 'Größen und Varianten',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
      {VARIANTS.flatMap((variant) =>
        SIZES.map((size) => (
          <div key={`${variant}-${size}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {variant === 'floating' ? (
              <div style={{ position: 'relative', width: 72, height: 72, border: '1px dashed var(--border-subtle)' }}>
                <IconButton icon={<X size={18} />} aria-label="Schließen" variant={variant} size={size} />
              </div>
            ) : (
              <IconButton icon={<X size={18} />} aria-label="Schließen" variant={variant} size={size} />
            )}
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{VARIANT_LABELS[variant]} / {size}</span>
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
