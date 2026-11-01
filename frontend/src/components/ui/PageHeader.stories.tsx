import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Button } from './Button'
import { PageHeader } from './PageHeader'

/** Primärer Seiten-Header: Überzeile, Titel, Beschreibung, Brotkrümel und Aktionen. */
const meta = {
  title: 'Zusammengesetzte Bausteine/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Besteht aus: ${storybookDocsLink('Grundbausteine/Heading', 'Heading')}, ${storybookDocsLink('Grundbausteine/Text', 'Text')}.`,
      },
    },
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

const BREADCRUMB_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  listStyle: 'none',
  margin: 0,
  padding: 0,
  fontSize: '0.875rem',
  color: 'var(--text-soft)',
}

export const Standard: Story = {
  args: {
    eyebrow: 'Fansub-Gruppe',
    title: 'C-Subs bearbeiten',
    description: 'Stammdaten, Logo und Banner der Gruppe pflegen.',
    breadcrumbs: (
      <ol style={BREADCRUMB_STYLE}>
        <li>Fansub-Gruppen</li>
        <li>/</li>
        <li>C-Subs</li>
      </ol>
    ),
    actions: <Button>Speichern</Button>,
  },
}

export const OhneActions: Story = {
  name: 'Ohne Aktionen',
  args: {
    eyebrow: 'Mitgliederbereich',
    title: 'Meine Gruppen',
    description: 'Header mit Beschreibung, aber ohne zusätzliche Aktionen.',
  },
}

export const LangerTitel: Story = {
  name: 'Langer Titel',
  args: {
    title: 'Ein außergewöhnlich langer Seitentitel, der das Umbruchverhalten des Headers auf schmalen Viewports prüft',
    description: 'Prüft, ob der Titel bei sehr langem Text sauber umbricht statt überzulaufen.',
  },
}
