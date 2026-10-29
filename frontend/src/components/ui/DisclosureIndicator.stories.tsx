import type { Meta, StoryObj } from '@storybook/nextjs'

import { DisclosureIndicator } from './DisclosureIndicator'

/** Öffner-Symbol-Primitive für aufklappbare Zeilen/Listen/Karten. */
const meta = {
  title: 'Grundbausteine/DisclosureIndicator',
  component: DisclosureIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof DisclosureIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Geschlossen: Story = {
  name: 'Geschlossen',
  args: { size: 'sm' },
}

export const Geoeffnet: Story = {
  name: 'Geoeffnet',
  args: { open: true },
}

export const Prominent: Story = {
  name: 'Prominent',
  args: { open: true, size: 'lg', variant: 'button' },
}

const SIZES = ['sm', 'md', 'lg'] as const
const VARIANTS = ['plain', 'button'] as const
const OPEN_STATES = [false, true] as const

export const GroessenUndVarianten: Story = {
  name: 'Größen und Varianten',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
      {SIZES.flatMap((size) =>
        VARIANTS.flatMap((variant) =>
          OPEN_STATES.map((open) => (
            <div
              key={`${size}-${variant}-${open}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
              <DisclosureIndicator size={size} variant={variant} open={open} />
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                {size} / {variant} / {open ? 'offen' : 'geschlossen'}
              </span>
            </div>
          )),
        ),
      )}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alle Größen-/Varianten-/Zustands-Kombinationen auf einen Blick vergleichen.' },
    },
  },
}
