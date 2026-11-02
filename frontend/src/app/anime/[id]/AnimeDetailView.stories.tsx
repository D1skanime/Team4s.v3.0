import type { Meta, StoryObj } from '@storybook/nextjs'

import { watchlistAbsentHandler, watchlistErrorHandler, watchlistPresentHandler } from '../../../../.storybook/mocks/handlers'

import { AnimeDetailView } from './AnimeDetailView'
import {
  buildAnimeDetailFixture,
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
  tags: ['autodocs'],
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
    // Leer, damit AnimeEdgeNavigation nicht gerendert wird (kein Grid-Kontext in der Story --
    // identisch zum echten Verhalten ohne gridQuery-Parameter, vermeidet einen zusätzlichen
    // MSW-Mock für getAnimeList, der laut CONTEXT.md nicht im Scope dieses Auftrags ist).
    gridQuery: '',
    embySeriesUrl: null,
    animeFansubsResponse: normalAnimeFansubsResponse,
    groupedEpisodesResponse: normalGroupedEpisodesResponse,
    fansubStoryGroups: [],
    relationsResponse: normalRelationsResponse,
    episodeCount: 3,
    coverUrl: '/covers/placeholder.jpg',
  },
} satisfies Meta<typeof AnimeDetailView>

export default meta
type Story = StoryObj<typeof meta>

// Kein eigenes `parameters.msw.handlers` -- fällt auf den globalen Default aus `preview.tsx`
// zurück (`watchlistAbsentHandler`), damit "Normal" tatsächlich den neutralen Basiszustand
// zeigt (nicht in der Watchlist), nicht versehentlich denselben Zustand wie `InWatchlist`.
export const Normal: Story = {}

export const InWatchlist: Story = {
  parameters: { msw: { handlers: [watchlistPresentHandler] } },
}

export const NichtInWatchlist: Story = {
  parameters: { msw: { handlers: [watchlistAbsentHandler] } },
}

export const WatchlistFehler: Story = {
  parameters: { msw: { handlers: [watchlistErrorHandler] } },
}

export const EpisodenFehler: Story = {
  args: { groupedEpisodesResponse: null, episodeCount: 0 },
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
