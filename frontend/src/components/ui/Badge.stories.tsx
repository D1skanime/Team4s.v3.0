import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'

/** Status-Badge-Primitive: alle sechs Varianten, bewusst unauffällig statt laut. */
const meta = {
  title: 'Grundbausteine/Badge',
  component: Badge,
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {
  args: { variant: 'neutral', children: 'Neutral' },
}

export const Erfolg: Story = {
  name: 'Erfolg',
  args: { variant: 'success', children: 'Erfolg' },
}

export const Warnung: Story = {
  name: 'Warnung',
  args: { variant: 'warning', children: 'Warnung' },
}

export const Gefahr: Story = {
  name: 'Gefahr',
  args: { variant: 'danger', children: 'Gefahr' },
}

export const Hinweis: Story = {
  name: 'Hinweis',
  args: { variant: 'info', children: 'Hinweis' },
}

export const Gedaempft: Story = {
  name: 'Gedämpft',
  args: { variant: 'muted', children: 'Gedämpft' },
}

const VARIANTS = ['neutral', 'success', 'warning', 'danger', 'info', 'muted'] as const
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  neutral: 'Neutral',
  success: 'Erfolg',
  warning: 'Warnung',
  danger: 'Gefahr',
  info: 'Hinweis',
  muted: 'Gedämpft',
}

export const GroessenUndVarianten: Story = {
  name: 'Größen und Varianten',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {VARIANT_LABELS[variant]}
        </Badge>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alle Varianten auf einen Blick vergleichen.' },
    },
  },
}
