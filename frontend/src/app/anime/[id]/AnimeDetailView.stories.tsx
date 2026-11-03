import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import {
  animeBackdropsHandler,
  groupedEpisodesLoadMoreHandler,
  groupedEpisodesHandler,
  watchlistAbsentHandler,
  watchlistErrorHandler,
  watchlistMutationHandlers,
  watchlistPresentHandler,
} from '../../../../.storybook/mocks/handlers'

import { AnimeDetailView } from './AnimeDetailView'
import {
  buildAnimeDetailFixture,
  emptyGroupedEpisodesResponse,
  freezingAnimeFansubsResponse,
  freezingFansubStoryGroups,
  freezingGroupedEpisodesResponse,
  manyGroupedEpisodesResponse,
  moreGroupedEpisodesResponse,
  normalAnimeFansubsResponse,
  normalGroupedEpisodesResponse,
  normalRelationsResponse,
} from './AnimeDetailView.fixtures'

/**
 * Zweite Pilot-Story für "ganze Seiten" in Storybook: rendert die echte öffentliche
 * Anime-Detailseite (Server/Ansicht-Split, siehe `AnimeDetailView.tsx`) mit realistischen
 * deutschen Fixture-Daten. `WatchlistAddButton`s Client-Fetch wird über MSW abgefangen
 * (`frontend/.storybook/mocks/handlers.ts`), nicht über Props -- der Rollen-Decorator (global in
 * `preview.tsx` aktiv) steuert, ob der Button "Anmeldung erforderlich" (anonym) oder den echten
 * Toggle-Zustand (Mitglied/Fansub-Leitung/Plattform-Admin) zeigt.
 */
const meta = {
  title: 'Im Einsatz/Öffentlich/Anime-Detail',
  component: AnimeDetailView,
  tags: ['autodocs', 'anime-detail-regression'],
  parameters: {
    docs: {
      description: {
        component:
          'Ebene "Im Einsatz": "Normal" ist Desktop/Mobil ' +
          'geprüft über die Viewport-Werkzeugleiste (Storybook-Standard-Viewport ist mobil, ' +
          '"Desktop 1440x900" über die Toolbar wählbar). Der global aktive Rollen-Umschalter ' +
          '("team4sRole" in der Toolbar) demonstriert "Eingeloggt ansehen": `WatchlistAddButton` ' +
          'zeigt je nach gewählter Rolle entweder "Anmeldung erforderlich" (anonym) oder den ' +
          'echten Merklisten-Toggle (Mitglied/Fansub-Leitung/Plattform-Admin) -- keine eigene ' +
          'zweite Story-Variante nötig, da der Umschalter global in `preview.tsx` wirkt.',
      },
    },
  },
  args: {
    anime: buildAnimeDetailFixture(),
    breadcrumbItems: [{ label: 'Anime', href: '/anime' }, { label: buildAnimeDetailFixture().title }],
    // Ohne Grid-Kontext wird die Randnavigation wie auf einem direkten Detailaufruf ausgeblendet.
    gridQuery: '',
    embySeriesUrl: null,
    animeFansubsResponse: normalAnimeFansubsResponse,
    groupedEpisodesResponse: normalGroupedEpisodesResponse,
    fansubStoryGroups: [],
    relationsResponse: normalRelationsResponse,
    episodeCount: 3,
    // .png statt .jpg: derselbe bereits geprüft dekodierbare Platzhalter wie
    // animeBackdropManifestFixture (siehe .storybook/mocks/animeFixtures.ts) -- .jpg ist nicht
    // dekodierbar (Commit 159-05), Backdrop-Rotator-Fallback und Poster würden sonst weiterhin
    // als kaputtes Bild rendern.
    coverUrl: '/covers/placeholder.png',
  },
} satisfies Meta<typeof AnimeDetailView>

export default meta
type Story = StoryObj<typeof meta>

// Kein eigenes `parameters.msw.handlers` -- fällt auf den globalen Default aus `preview.tsx`
// zurück (`watchlistAbsentHandler`), damit "Normal" tatsächlich den neutralen Basiszustand
// zeigt (nicht in der Watchlist), nicht versehentlich denselben Zustand wie `InWatchlist`.
export const Normal: Story = {}

export const InWatchlist: Story = {
  parameters: { msw: { handlers: [animeBackdropsHandler, watchlistPresentHandler, ...watchlistMutationHandlers] } },
}

export const NichtInWatchlist: Story = {
  parameters: { msw: { handlers: [animeBackdropsHandler, watchlistAbsentHandler, ...watchlistMutationHandlers] } },
}

export const WatchlistFehler: Story = {
  parameters: { msw: { handlers: [animeBackdropsHandler, watchlistErrorHandler, ...watchlistMutationHandlers] } },
}

export const EpisodenFehler: Story = {
  args: { groupedEpisodesResponse: null, episodeCount: 0 },
}

export const KeineEpisoden: Story = {
  args: { groupedEpisodesResponse: emptyGroupedEpisodesResponse, episodeCount: 0 },
}

export const VieleEpisoden: Story = {
  args: { groupedEpisodesResponse: manyGroupedEpisodesResponse, episodeCount: 48 },
  parameters: {
    msw: { handlers: [animeBackdropsHandler, watchlistAbsentHandler, ...watchlistMutationHandlers, groupedEpisodesLoadMoreHandler(moreGroupedEpisodesResponse)] },
    docs: {
      description: {
        story: 'Beim Erreichen des unteren Listenrands lädt der echte Episoden-Browser die zweite Cursor-Seite nach.',
      },
    },
  },
}

export const MehrereFansubgruppen: Story = {
  name: 'Mehrere Fansubgruppen',
  args: {
    anime: buildAnimeDetailFixture({
      id: 13,
      slug: 'freezing',
      title: 'Freezing',
      max_episodes: 12,
      genres: ['Action', 'Science-Fiction', 'Drama'],
      tags: ['Pandora', 'Stigmata', 'Turnier'],
      description: 'In einer Zukunft nach den Nova-Angriffen kämpfen die Pandora mit ihren Stigmata gegen die Bedrohung. Kazuya begegnet an der West Genetics Academy der ungestümen Satellizer el Bridget.',
    }),
    breadcrumbItems: [{ label: 'Anime', href: '/anime' }, { label: 'Freezing' }],
    animeFansubsResponse: freezingAnimeFansubsResponse,
    groupedEpisodesResponse: freezingGroupedEpisodesResponse,
    fansubStoryGroups: freezingFansubStoryGroups,
    relationsResponse: null,
    episodeCount: 12,
  },
  parameters: {
    msw: { handlers: [animeBackdropsHandler, watchlistAbsentHandler, ...watchlistMutationHandlers, groupedEpisodesHandler(freezingGroupedEpisodesResponse)] },
    docs: { description: { story: 'Die Umschalter zeigen Bloody-Shadow, LazySubs und MelonSubs. Ein Klick lädt die echte gruppengefilterte Episodenansicht über MSW; die Gruppenkarte wechselt mit.' } },
  },
}

export const MitRandnavigation: Story = {
  name: 'Mit Zurück und Weiter',
  args: {
    anime: buildAnimeDetailFixture({ id: 13, slug: 'freezing', title: 'Freezing' }),
    breadcrumbItems: [{ label: 'Anime', href: '/anime' }, { label: 'Freezing' }],
    gridQuery: 'page=1&per_page=24',
  },
  parameters: {
    docs: { description: { story: 'Die beiden Randnavigationen nutzen die zentrale MSW-Liste. Mit Hover oder Fokus erscheinen die echten Vorschaukarten.' } },
  },
}

export const MerklistenToggle: Story = {
  name: 'Merkliste umschalten',
  globals: { team4sRole: 'mitglied' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /Zur Watchlist/ }))
    await expect(canvas.findByText('Zur Watchlist hinzugefügt.')).resolves.toBeTruthy()
    await userEvent.click(await canvas.findByRole('button', { name: /In Watchlist/ }))
    await expect(canvas.findByText('Aus Watchlist entfernt.')).resolves.toBeTruthy()
  },
}

export const LangerTitel: Story = {
  args: {
    anime: buildAnimeDetailFixture({
      title:
        'Die unglaublich lange Geschichte von den sieben vergessenen Königreichen und ihrem ewigen Winterkrieg',
    }),
  },
}

export const FehlendesCover: Story = {
  args: {
    anime: buildAnimeDetailFixture({ cover_image: '' }),
    coverUrl: '',
  },
}

export const OhneGenresUndTags: Story = {
  name: 'Ohne Genres und Tags',
  args: {
    anime: buildAnimeDetailFixture({ genres: [], tags: [] }),
  },
}
