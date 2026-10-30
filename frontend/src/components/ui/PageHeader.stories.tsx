import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { Button } from './Button'
import { PageHeader } from './PageHeader'

/** Primärer Seiten-Header: Eyebrow, Titel, Beschreibung, Breadcrumbs und Actions. */
const meta = {
  title: 'Zusammengesetzte Bausteine/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Heading, Text.',
      },
    },
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    eyebrow: 'Interne Dev-Route',
    title: 'Team4s UI-System-Labor',
    description:
      'Design-Tokens, generische UI-Komponenten und typische Oberflächenkompositionen an einem Ort prüfen, bevor echte Seiten migriert werden.',
    breadcrumbs: (
      <ol style={{ display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
        <li><Badge variant="muted">/dev</Badge></li>
        <li><Badge variant="info">ui-system</Badge></li>
      </ol>
    ),
    actions: <Button>Modal prüfen</Button>,
  },
}

export const OhneActions: Story = {
  name: 'Ohne Aktionen',
  args: {
    eyebrow: 'Preview',
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
