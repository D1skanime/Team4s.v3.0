import type { Meta, StoryObj } from '@storybook/nextjs'

import { AnimeMediaProvider } from '@/components/anime/AnimeMediaProvider'
import { storybookDocsLink } from '@/lib/storybookLinks'

import { AnimeDetailHero } from './AnimeDetailHero'
import { buildAnimeDetailFixture, normalRelationsResponse } from './AnimeDetailView.fixtures'

/** Zusammengesetzter öffentlicher Anime-Kopf aus Poster, Merklisten-Aktion und Info-Karte. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Anime-Kopf',
  component: AnimeDetailHero,
  tags: ['autodocs'],
  decorators: [(Story, context) => <AnimeMediaProvider animeID={context.args.anime.id}><Story /></AnimeMediaProvider>],
  parameters: {
    docs: {
      description: {
        component: `Besteht aus ${storybookDocsLink('Grundbausteine/Card', 'Card')} (Glasfläche), ` +
          `${storybookDocsLink('Grundbausteine/MediaFrame', 'MediaFrame')}, ${storybookDocsLink('Grundbausteine/ResponsiveImage', 'ResponsiveImage')}, ` +
          `${storybookDocsLink('Grundbausteine/Badge', 'Badge')}, ${storybookDocsLink('Grundbausteine/LinkChip', 'LinkChip')} und dem fachlichen Merklisten- sowie Medienkontext.`,
      },
    },
  },
  args: {
    anime: buildAnimeDetailFixture(),
    coverUrl: '/covers/placeholder.jpg',
    embySeriesUrl: null,
    relationsResponse: normalRelationsResponse,
  },
} satisfies Meta<typeof AnimeDetailHero>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const LangerTitel: Story = {
  name: 'Langer Titel',
  args: { anime: buildAnimeDetailFixture({ title: 'Die unglaublich lange Geschichte von den sieben vergessenen Königreichen und ihrem ewigen Winterkrieg' }) },
}
