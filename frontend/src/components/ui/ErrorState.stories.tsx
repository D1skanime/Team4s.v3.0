import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Button } from './Button'
import { ErrorState, getErrorStateCopy } from './ErrorState'

const meta = {
  title: 'Zusammengesetzte Bausteine/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Fehlerzustand-Primitive für einen Bereich, der nicht geladen werden konnte. Zeigt je nach ' +
          'Ursache eine passende Meldung -- z. B. eine eigene, verständliche Erklärung bei fehlender ' +
          'Berechtigung statt der generischen "Fehler beim Laden"-Meldung. Besteht aus: ' +
          `${storybookDocsLink('Grundbausteine/Card', 'Card')}, ${storybookDocsLink('Grundbausteine/StatusIcon', 'StatusIcon')}, ${storybookDocsLink('Grundbausteine/Heading', 'Heading')}, ${storybookDocsLink('Grundbausteine/Text', 'Text')}.`,
      },
    },
  },
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const Generisch: Story = {
  name: 'Generisch',
  args: {
    title: 'Release-Liste konnte nicht geladen werden',
    description: 'Der Fehler bleibt lokal am betroffenen Bereich und kann direkt erneut versucht werden.',
    action: <Button variant="danger" size="sm">Erneut versuchen</Button>,
  },
}

const forbiddenCopy = getErrorStateCopy({ status: 403 })

export const KeineBerechtigung: Story = {
  name: 'Keine Berechtigung',
  args: {
    title: forbiddenCopy.title,
    description: forbiddenCopy.description,
  },
}

export const OhneAction: Story = {
  name: 'Ohne Aktion',
  args: {
    title: 'Fehler beim Laden',
    description: 'Die Daten konnten nicht geladen werden.',
  },
}

export const Kompakt: Story = {
  name: 'Kompakt',
  args: {
    compact: true,
    title: 'Vorschau fehlgeschlagen',
    description: 'Dieser einzelne Bereich konnte nicht geladen werden.',
  },
}
