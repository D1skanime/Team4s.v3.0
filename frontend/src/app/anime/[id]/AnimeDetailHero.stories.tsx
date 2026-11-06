import type { Meta, StoryObj } from '@storybook/nextjs'

import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
import { AnimeMediaProvider } from '@/components/anime/AnimeMediaProvider'
import { buildAnimeDetailHref } from '@/lib/animeGridContext'
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
          `${storybookDocsLink('Grundbausteine/Badge', 'Badge')}, ${storybookDocsLink('Grundbausteine/LinkChip', 'LinkChip')}, ` +
          `${storybookDocsLink('Grundbausteine/Stack', 'Stack')} und ${storybookDocsLink('Grundbausteine/Cluster', 'Cluster')} ` +
          `(Cluster float="controlBand" für den optionalen \`edgeNavigation\`-Slot, siehe ` +
          `${storybookDocsLink('Zusammengesetzte Bausteine/Anime-Randnavigation', 'AnimeEdgeNavigation')}) ` +
          `und dem fachlichen Merklisten- sowie Medienkontext.`,
      },
    },
  },
  args: {
    anime: buildAnimeDetailFixture(),
    // .png statt .jpg: derselbe bereits geprüft dekodierbare Platzhalter wie
    // animeBackdropManifestFixture (siehe .storybook/mocks/animeFixtures.ts) -- .jpg ist nicht
    // dekodierbar (Commit 159-05).
    coverUrl: '/covers/placeholder.png',
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

// Dieselben Standard-Args, nur der Viewport unterscheidet sich -- Nachweis, dass diese Story
// exakt dasselbe Zwei-Spalten-Raster (Poster links, Info rechts) wie die Live-Seite rendert, da
// AnimeDetailHero die äußere Card+SplitLayout vollständig selbst besitzt statt nur eines
// unvollständigen Fragments, das die Seite erst zur Karte zusammensetzen müsste.
export const Desktop1440: Story = {
  name: 'Desktop 1440px',
  parameters: { viewport: { defaultViewport: 'desktop1440' } },
}

// Gegenstück zu Desktop1440: unterhalb von SplitLayouts festem Container-Haltepunkt (768px) muss
// dieselbe Story auf eine einzelne, gestapelte Spalte kollabieren.
export const Mobile390: Story = {
  name: 'Mobil 390px',
  parameters: { viewport: { defaultViewport: 'mobile390' } },
}

// Dieselben Nachbar-Props wie die eigenstaendige "Anime-Randnavigation"-Story (siehe
// AnimeEdgeNavigation.stories.tsx) -- zeigt zusaetzlich zu dieser, dass der Anime-Kopf die
// Randnavigation an BEIDEN Haltepunkten korrekt einbettet (schwebendes Band oberhalb 768px,
// zentrierte Zeile im Textfluss darunter, siehe Cluster float="controlBand" in AnimeDetailHero.tsx).
const edgeNavigationPrevious = { href: buildAnimeDetailHref(12, 'page=1&per_page=24'), label: 'Zurück', ariaLabel: 'Vorheriger Anime: Freezing: Erstes Kapitel' }
const edgeNavigationNext = { href: buildAnimeDetailHref(14, 'page=1&per_page=24'), label: 'Weiter', ariaLabel: 'Nächster Anime: Freezing: Vibration' }

export const MitRandnavigationDesktop: Story = {
  name: 'Mit Randnavigation Desktop 1440px',
  args: {
    edgeNavigation: (
      <AnimeEdgeNavigation currentAnimeID={13} gridQuery="page=1&per_page=24" previous={edgeNavigationPrevious} next={edgeNavigationNext} />
    ),
  },
  parameters: { viewport: { defaultViewport: 'desktop1440' } },
}

export const MitRandnavigationMobil: Story = {
  name: 'Mit Randnavigation Mobil 390px',
  args: {
    edgeNavigation: (
      <AnimeEdgeNavigation currentAnimeID={13} gridQuery="page=1&per_page=24" previous={edgeNavigationPrevious} next={edgeNavigationNext} />
    ),
  },
  parameters: { viewport: { defaultViewport: 'mobile390' } },
}
