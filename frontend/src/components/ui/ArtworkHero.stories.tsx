import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from './Badge'
import { Button } from './Button'
import { ArtworkHero } from './ArtworkHero'
import { HeroMetrics } from './HeroMetrics'

/** Identitäts-Hero-Fläche mit optionalem Hintergrund-Artwork, Avatar, Status und Kennzahlen. */
const meta = {
  title: 'Zusammengesetzte Bausteine/ArtworkHero',
  component: ArtworkHero,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: ResponsiveImage.',
      },
    },
  },
  args: {
    ariaLabel: 'C-Subs Profil',
    title: 'C-Subs',
    avatar: <span style={{ fontWeight: 700 }}>CS</span>,
    status: <Badge variant="success">Aktiv</Badge>,
    context: 'Fansub-Gruppe seit 2002, 20 Anime-Projekte.',
    metrics: (
      <HeroMetrics
        ariaLabel="Kennzahlen"
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
    // Lokales Platzhalterbild statt externer Bildquelle — Storybook zeigt wie die
    // frühere In-App-Showcase ausschließlich Mockdaten, keine Netzwerkabhängigkeit.
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
