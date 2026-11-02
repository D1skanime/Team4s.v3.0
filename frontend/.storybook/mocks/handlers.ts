import { http, HttpResponse } from 'msw'

import type { MemberProfileData } from '@/types/profile'
import type { WatchlistCreateResponse } from '@/types/watchlist'
import type { PublicGroupedEpisodesResponse } from '@/types/episodeVersion'

/**
 * Zentrale MSW-Handler für echte Client-seitige `fetch`-Aufrufe aus Storybook-Stories (nicht für
 * die Server/Ansicht-Split-Pilotseiten selbst -- deren Daten kommen als Props, siehe
 * `AnimeListView`/`AnimeDetailView`). Fängt im Pilot-Scope `GET /api/v1/me/profile`
 * (`AppShellClientWrapper`, Rollen-Umschalter) und `GET /api/v1/watchlist/:animeID`
 * (`WatchlistAddButton`) ab, bevor der Request das Storybook-iframe verlässt.
 */

/** Von `roleSimulation.ts` gesetzte, aktuell für die Rollen-Simulation aktive Profil-Fixture --
 *  `null` bedeutet anonym (kein Profil ladbar, Handler antwortet mit 404). Modulweiter mutable
 *  State ist hier bewusst gewählt: MSW-Handler laufen außerhalb von Reacts Render-Zyklus und
 *  brauchen eine synchron lesbare Quelle für die "aktuell simulierte Rolle". */
let activeProfileFixture: MemberProfileData | null = null

/** Setzt die aktuell aktive Profil-Fixture -- wird vom Rollen-Decorator (`roleSimulation.ts`) vor
 *  jedem Render aufgerufen, damit Session-Store (`persistAuthSession`) und MSW-Antwort immer zur
 *  selben simulierten Rolle passen. */
export function setActiveProfileFixture(profile: MemberProfileData | null): void {
  activeProfileFixture = profile
}

/** Standard-Handler: liefert die aktuell simulierte Profil-Fixture oder 404 für "anonym". */
export const profileHandler = http.get('*/api/v1/me/profile', () => {
  if (!activeProfileFixture) {
    return HttpResponse.json({ error: 'nicht angemeldet' }, { status: 404 })
  }
  return HttpResponse.json({ data: activeProfileFixture })
})

/** Standard-Handler: Anime ist NICHT in der Watchlist (404) -- Grundzustand für die
 *  `NichtInWatchlist`-Story-Variante von `AnimeDetailView`. */
export const watchlistAbsentHandler = http.get('*/api/v1/watchlist/:animeID', () => {
  return HttpResponse.json({ error: 'nicht in Watchlist' }, { status: 404 })
})

/** Override-Handler für die `InWatchlist`-Story-Variante: Anime ist bereits in der Watchlist. */
export const watchlistPresentHandler = http.get('*/api/v1/watchlist/:animeID', ({ params }) => {
  const animeID = Number(params.animeID)
  const body: WatchlistCreateResponse = {
    data: {
      anime_id: animeID,
      title: 'Demo Anime',
      type: 'anime',
      status: 'ongoing',
      added_at: '2026-01-01T00:00:00.000Z',
    },
  }
  return HttpResponse.json(body)
})

/** Override-Handler für Fehlerzustand-Stories: Watchliststatus ist serverseitig nicht abrufbar. */
export const watchlistErrorHandler = http.get('*/api/v1/watchlist/:animeID', () => {
  return HttpResponse.json({ error: 'interner Fehler' }, { status: 500 })
})

/** Liefert für eine Detailseiten-Story genau die nächste Cursor-Seite. Der Cursor ist Pflicht,
 * damit die Story nur den echten Nachladepfad simuliert und keinen SSR-Prop-Datensatz ersetzt. */
export function groupedEpisodesLoadMoreHandler(page: PublicGroupedEpisodesResponse) {
  return http.get('*/api/v1/anime/:animeID/episodes', ({ request }) => {
    const cursor = new URL(request.url).searchParams.get('cursor')
    if (!cursor) return HttpResponse.json({ error: 'Cursor fehlt' }, { status: 400 })
    return HttpResponse.json(page)
  })
}

/** Default-Handler-Liste für `preview.tsx` -- einzelne Stories überschreiben sie bei Bedarf über
 *  `parameters.msw.handlers`. */
export const defaultHandlers = [profileHandler, watchlistAbsentHandler]
