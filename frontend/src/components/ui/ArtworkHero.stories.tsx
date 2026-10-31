import type { Meta, StoryObj } from '@storybook/nextjs'
import { Check } from 'lucide-react'

import { Badge } from './Badge'
import { Button } from './Button'
import { ArtworkHero } from './ArtworkHero'
import { MetricList } from './MetricList'

/** Identitäts-Hero-Fläche für ein Profil oder eine Gruppe, mit optionalem Hintergrund-Artwork,
 *  Avatar, Status und Kennzahlen. */
const meta = {
  title: 'Zusammengesetzte Bausteine/ArtworkHero',
  component: ArtworkHero,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Card, Avatar, ResponsiveImage, Heading (Hero-Titel), Text sowie die Slot-Bausteine MetricList, Badge, Button.',
      },
    },
  },
  args: {
    ariaLabel: 'C-Subs Profil',
    title: 'C-Subs',
    avatarLabel: 'C-Subs',
    status: <Badge variant="success">Aktiv</Badge>,
    context: 'Fansub-Gruppe seit 2002, 20 Anime-Projekte.',
    metrics: (
      <MetricList
        ariaLabel="Kennzahlen"
        valueHeadingLevel={2}
        items={[
          { label: 'Anime-Projekte', value: 20 },
          { label: 'Release-Versionen', value: 59 },
        ]}
      />
    ),
    actions: <Button size="sm">Gruppe öffnen</Button>,
  },
} satisfies Meta<typeof ArtworkHero>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    // Lokales Platzhalterbild statt externer Bildquelle.
    imageUrl: '/covers/placeholder.jpg',
  },
}

export const OhneArtwork: Story = {
  name: 'Ohne Artwork',
  args: {
    imageUrl: null,
    fallbackImageUrl: null,
  },
  parameters: {
    docs: {
      description: { story: 'Fallback-Zustand ohne verfügbares Hintergrund-Artwork.' },
    },
  },
}

export const MitRollen: Story = {
  name: 'Mit Rollen',
  args: {
    title: 'Mira Sato',
    avatarLabel: 'Mira Sato',
    imageUrl: null,
    fallbackImageUrl: null,
    status: <Badge variant="success"><Check size={14} aria-hidden="true" />Verifiziert</Badge>,
    roles: (
      <>
        <Badge>Übersetzung</Badge>
        <Badge>Qualitätssicherung</Badge>
      </>
    ),
    context: 'Naruto · C-Subs',
    metrics: (
      <MetricList
        ariaLabel="Beiträge"
        variant="inline"
        valueHeadingLevel={2}
        items={[
          { label: 'Folgen', value: 13 },
          { label: 'Beiträge', value: 12 },
        ]}
      />
    ),
    actions: <Button variant="subtle" size="sm">Vollständiges Profil</Button>,
  },
  parameters: {
    docs: {
      description: { story: 'Mit Verifiziert-Status und Rollen-Abzeichen, z. B. für ein Mitwirkungsprofil.' },
    },
  },
}
