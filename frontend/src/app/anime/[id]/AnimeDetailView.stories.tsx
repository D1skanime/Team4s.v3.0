import type { Meta, StoryObj } from '@storybook/nextjs'

import { watchlistErrorHandler, watchlistPresentHandler } from '../../../../.storybook/mocks/handlers'

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

export const Normal: Story = {
  parameters: { msw: { handlers: [watchlistPresentHandler] } },
}

export const InWatchlist: Story = {
  parameters: { msw: { handlers: [watchlistPresentHandler] } },
}

export const NichtInWatchlist: Story = {}

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
