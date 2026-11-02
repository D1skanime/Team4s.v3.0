import type { Meta, StoryObj } from '@storybook/nextjs'
import { CheckCircle2 } from 'lucide-react'

import { Badge } from './Badge'

/** Status-Badge-Primitive: alle sieben Varianten, bewusst unauffällig statt laut. */
const meta = {
  title: 'Grundbausteine/Badge',
  component: Badge,
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {
  args: { variant: 'neutral', children: 'Entwurf' },
}

export const Erfolg: Story = {
  name: 'Erfolg',
  args: { variant: 'success', children: 'Veröffentlicht' },
}

export const Warnung: Story = {
  name: 'Warnung',
  args: { variant: 'warning', children: 'Ausstehend' },
}

export const Gefahr: Story = {
  name: 'Gefahr',
  args: { variant: 'danger', children: 'Archiviert' },
}

export const Hinweis: Story = {
  name: 'Hinweis',
  args: { variant: 'info', children: 'Zur Prüfung' },
}

export const Gedaempft: Story = {
  name: 'Gedämpft',
  args: { variant: 'muted', children: 'Inaktiv' },
}

export const MitIcon: Story = {
  name: 'Mit Icon',
  args: {
    variant: 'success',
    children: (
      <>
        <CheckCircle2 size={14} />
        Freigegeben
      </>
    ),
  },
  parameters: {
    docs: {
      description: { story: 'Badge ist ein inline-flex-Element mit Abstand -- ein Icon neben dem Text funktioniert ohne Code-Änderung an Badge.' },
    },
  },
}

export const AufBild: Story = {
  name: 'Auf Bild',
  args: { variant: 'onMedia', children: 'Inaktiv' },
  render: (args) => (
    <div style={{ background: 'linear-gradient(135deg, #1c2440, #4a2540)', padding: 24, borderRadius: 12 }}>
      <Badge {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Für Status-Badges auf Bannerfotos oder anderen dunklen Bild-Hintergründen -- eigene, kontrastgeprüfte Tokens statt der auf hellen Flächen gedachten Gedämpft-Variante.' },
    },
  },
}

const VARIANTS = ['neutral', 'success', 'warning', 'danger', 'info', 'muted'] as const
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  neutral: 'Entwurf',
  success: 'Veröffentlicht',
  warning: 'Ausstehend',
  danger: 'Archiviert',
  info: 'Zur Prüfung',
  muted: 'Inaktiv',
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
