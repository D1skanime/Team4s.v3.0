import { http, HttpResponse } from 'msw'

import type { MemberProfileData } from '@/types/profile'
import type { WatchlistCreateResponse } from '@/types/watchlist'
import type { PublicGroupedEpisodesResponse } from '@/types/episodeVersion'

import { animeBackdropManifestFixture, animeNavigationFixture } from './animeFixtures'

/**
 * Zentrale MSW-Handler für echte Client-seitige `fetch`-Aufrufe aus Storybook-Stories (nicht für
 * die Server/Ansicht-Split-Pilotseiten selbst -- deren Daten kommen als Props, siehe
 * `AnimeListView`/`AnimeDetailView`). Fängt im Pilot-Scope `GET /api/v1/me/profile`
 * (`AppShellClientWrapper`, Rollen-Umschalter), `GET /api/v1/watchlist/:animeID`
 * (`WatchlistAddButton`), `POST /api/v1/watchlist`, `DELETE /api/v1/watchlist/:animeID`,
 * `GET /api/v1/anime/:id/backdrops` (`AnimeMediaProvider`) sowie die
 * interaktiven Detail-Nachfragen für Gruppen und Randnavigation ab, bevor ein Request das
 * Storybook-iframe verlässt.
 */

/** Von `roleSimulation.ts` gesetzte, aktuell für die Rollen-Simulation aktive Profil-Fixture --
 *  `null` bedeutet anonym (kein Profil ladbar, Handler antwortet mit 404). Modulweiter mutable
 *  State ist hier bewusst gewählt: MSW-Handler laufen außerhalb von Reacts Render-Zyklus und
 *  brauchen eine synchron lesbare Quelle für die "aktuell simulierte Rolle". */
let activeProfileFixture: MemberProfileData | null = null
const watchlistAnimeIDs = new Set<number>()

/** Setzt die aktuell aktive Profil-Fixture -- wird vom Rollen-Decorator (`roleSimulation.ts`) vor
 *  jedem Render aufgerufen, damit Session-Store (`persistAuthSession`) und MSW-Antwort immer zur
 *  selben simulierten Rolle passen. */
export function setActiveProfileFixture(profile: MemberProfileData | null): void {
  activeProfileFixture = profile
}

/** Setzt den Merklisten-Demozustand vor einem neuen Story-Render zurück. */
export function resetWatchlistStoryState(): void {
  watchlistAnimeIDs.clear()
}

function watchlistResponse(animeID: number): WatchlistCreateResponse {
  return {
    data: {
      anime_id: animeID,
      title: 'Demo Anime',
      type: 'anime',
      status: 'ongoing',
      added_at: '2026-01-01T00:00:00.000Z',
    },
  }
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
export const watchlistAbsentHandler = http.get('*/api/v1/watchlist/:animeID', ({ params }) => {
  watchlistAnimeIDs.delete(Number(params.animeID))
  return HttpResponse.json({ error: 'nicht in Watchlist' }, { status: 404 })
})

/** Override-Handler für die `InWatchlist`-Story-Variante: Anime ist bereits in der Watchlist. */
export const watchlistPresentHandler = http.get('*/api/v1/watchlist/:animeID', ({ params }) => {
  const animeID = Number(params.animeID)
  watchlistAnimeIDs.add(animeID)
  return HttpResponse.json(watchlistResponse(animeID))
})

/** Override-Handler für Fehlerzustand-Stories: Watchliststatus ist serverseitig nicht abrufbar. */
export const watchlistErrorHandler = http.get('*/api/v1/watchlist/:animeID', () => {
  return HttpResponse.json({ error: 'interner Fehler' }, { status: 500 })
})

/** Standard-Handler für die Statusabfrage und den vollständigen Merklisten-Toggle einer Story. */
export const watchlistStateHandler = http.get('*/api/v1/watchlist/:animeID', ({ params }) => {
  const animeID = Number(params.animeID)
  return watchlistAnimeIDs.has(animeID)
    ? HttpResponse.json(watchlistResponse(animeID))
    : HttpResponse.json({ error: 'nicht in Watchlist' }, { status: 404 })
})

/** Zustandsbehaftete Mutation: das Hinzufügen macht den folgenden Toggle zum Entfernen. */
export const watchlistCreateHandler = http.post('*/api/v1/watchlist', async ({ request }) => {
  const body = await request.json() as { anime_id?: unknown }
  const animeID = Number(body.anime_id)
  if (!Number.isSafeInteger(animeID) || animeID <= 0) {
    return HttpResponse.json({ error: 'Anime-ID fehlt' }, { status: 400 })
  }
  watchlistAnimeIDs.add(animeID)
  return HttpResponse.json(watchlistResponse(animeID), { status: 201 })
})

/** Zustandsbehaftete Mutation: das Entfernen macht den folgenden Toggle wieder zum Hinzufügen. */
export const watchlistDeleteHandler = http.delete('*/api/v1/watchlist/:animeID', ({ params }) => {
  watchlistAnimeIDs.delete(Number(params.animeID))
  return new HttpResponse(null, { status: 204 })
})

export const watchlistMutationHandlers = [watchlistCreateHandler, watchlistDeleteHandler]

/** Standard-Handler für das vom AnimeMediaProvider beim Detail-Render geladene Manifest. */
export const animeBackdropsHandler = http.get('*/api/v1/anime/:animeID/backdrops', ({ params }) => {
  return HttpResponse.json({
    data: { ...animeBackdropManifestFixture.data, anime_id: Number(params.animeID) },
  })
})

/** Standard-Handler für die echte Hover-/Klick-Navigation im Listen-Kontext einer Detail-Story. */
export const animeNavigationHandler = http.get('*/api/v1/anime', () => {
  return HttpResponse.json(animeNavigationFixture)
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

/** Liefert eine vollständige Gruppenansicht für interaktive Detail-Stories mit mehreren Gruppen. */
export function groupedEpisodesHandler(page: PublicGroupedEpisodesResponse) {
  return http.get('*/api/v1/anime/:animeID/episodes', () => HttpResponse.json(page))
}

/** Default-Handler-Liste für `preview.tsx` -- einzelne Stories überschreiben sie bei Bedarf über
 *  `parameters.msw.handlers`. */
export const defaultHandlers = [
  profileHandler,
  watchlistStateHandler,
  ...watchlistMutationHandlers,
  animeBackdropsHandler,
  animeNavigationHandler,
]
