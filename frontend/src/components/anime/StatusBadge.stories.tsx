import type { Meta, StoryObj } from '@storybook/nextjs'

import { Cluster } from '@/components/ui'
import { storybookDocsLink } from '@/lib/storybookLinks'
import type { AnimeStatus } from '@/types/anime'

import { StatusBadge } from './StatusBadge'

const meta = {
  title: 'Zusammengesetzte Bausteine/Anime-Status',
  component: StatusBadge,
  tags: ['autodocs'],
  // `status` ist bei StatusBadge ein Pflichtprop; die "Alle Zustände"-Story unten
  // überschreibt die Darstellung per `render` und braucht diesen Platzhalter nicht.
  args: { status: 'ongoing' },
  parameters: {
    docs: {
      description: {
        component:
          'Status-Badge für Anime-Datensätze. Besteht aus: ' +
          `${storybookDocsLink('Grundbausteine/Badge', 'Badge')} mit einem lucide-Icon je Status.`,
      },
    },
  },
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Laufend: Story = {
  name: 'Laufend',
  args: { status: 'ongoing' },
}

export const Abgeschlossen: Story = {
  name: 'Abgeschlossen',
  args: { status: 'done' },
}

export const Abgebrochen: Story = {
  name: 'Abgebrochen',
  args: { status: 'aborted' },
}

export const Lizenziert: Story = {
  name: 'Lizenziert',
  args: { status: 'licensed' },
}

export const Deaktiviert: Story = {
  name: 'Deaktiviert',
  args: { status: 'disabled' },
}

const ALL_STATUSES: AnimeStatus[] = ['ongoing', 'done', 'aborted', 'licensed', 'disabled']

export const AlleZustaende: Story = {
  name: 'Alle Zustände',
  render: () => (
    <Cluster gap="badgeRow">
      {ALL_STATUSES.map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </Cluster>
  ),
  parameters: {
    docs: {
      description: { story: 'Alle fünf Anime-Status nebeneinander im Vergleich.' },
    },
  },
}
