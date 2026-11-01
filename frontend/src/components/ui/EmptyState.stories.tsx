import type { Meta, StoryObj } from '@storybook/nextjs'
import { Info } from 'lucide-react'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Button } from './Button'
import { EmptyState } from './EmptyState'

const meta = {
  title: 'Zusammengesetzte Bausteine/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Leerzustand-Primitive für Listen/Übersichten ohne Einträge. Besteht aus: ${storybookDocsLink('Grundbausteine/Card', 'Card')}, ${storybookDocsLink('Grundbausteine/StatusIcon', 'StatusIcon')}, ${storybookDocsLink('Grundbausteine/Heading', 'Heading')}, ${storybookDocsLink('Grundbausteine/Text', 'Text')}.`,
      },
    },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    title: 'Noch keine Gruppen',
    description: 'Leere Listen sollen den nächsten sinnvollen Schritt zeigen statt nur leer zu wirken.',
    action: <Button variant="secondary" size="sm">Neue Gruppe</Button>,
  },
}

export const InfoVariante: Story = {
  name: 'Info-Variante',
  args: {
    variant: 'info',
    icon: <Info size={20} strokeWidth={2} />,
    title: 'Abrufgrenze erreicht',
    description: 'Es werden die ersten 500 Einträge angezeigt – bitte die Suche eingrenzen.',
  },
}

export const OhneAction: Story = {
  name: 'Ohne Aktion',
  args: {
    title: 'Keine Treffer',
    description: 'Für die aktuelle Filterkombination gibt es keine passenden Einträge.',
  },
}
