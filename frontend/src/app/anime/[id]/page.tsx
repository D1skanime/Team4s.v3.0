import { Suspense } from 'react'
import type { Metadata } from 'next'

import {
  getAnimeRelations,
  getAnimeFansubs,
  getGroupedEpisodes,
} from '@/lib/api'
import {
  buildAnimeDetailHref,
  buildAnimeGridQuery,
  normalizeGridQuery,
  parseAnimeListParamsFromGridQuery,
  resolveAnimeNeighbors,
  type AnimeNeighbors,
} from '@/lib/animeGridContext'
import { buildFansubStoryGroups, resolveActiveFansubSlug } from '@/lib/fansub-summary'
import { getEmbySeriesUrlForAnime } from '@/lib/emby'
import { resolveAnimeCoverURL } from '@/lib/animeBackdrops'

import type { AdjacentNavigationItem } from '@/components/ui'
import type { AnimeDetail } from '@/types/anime'

import { AnimeDetailView } from './AnimeDetailView'
import AnimeDetailLoading from './AnimeDetailLoading'
import { loadAnimeDetail } from './animeDetailData'

/** Props für die Anime-Detailseite mit URL-Parametern und optionalen Such-Parametern. */
interface AnimeDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ from?: string | string[]; grid_query?: string | string[]; fansub?: string | string[] }>
}

export async function generateMetadata({ params }: AnimeDetailPageProps): Promise<Metadata> {
  const anime = await loadAnimeDetail((await params).id)
  return {
    title: `${anime.title} | Team4s`,
    alternates: { canonical: `/anime/${anime.id}` },
  }
}

/**
 * Anime-Detailseite.
 * Lädt Anime-Daten sowie die textuellen Detailbereiche serverseitig. Backdrops und Theme-Videos
 * werden nach dem ersten Render clientseitig geladen, damit das Cover sofort sichtbar ist.
 * Zeigt Poster, Beschreibung, Episodenliste mit Fansub-Filter sowie einen Kommentarbereich.
 */
export default async function AnimeDetailPage({ params, searchParams }: AnimeDetailPageProps) {
  const anime = await loadAnimeDetail((await params).id)
  return (
    <Suspense fallback={<AnimeDetailLoading />}>
      <AnimeDetailContent anime={anime} searchParams={searchParams} />
    </Suspense>
  )
}

async function AnimeDetailContent({ anime, searchParams }: {
  anime: AnimeDetail
  searchParams: AnimeDetailPageProps['searchParams']
}) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as {
    from?: string | string[]
    grid_query?: string | string[]
    fansub?: string | string[]
  }
  const breadcrumbItems = [
    { label: 'Anime', href: '/anime' },
    { label: anime.title },
  ]
  const rawGridQuery =
    typeof resolvedSearchParams.grid_query === 'string' ? resolvedSearchParams.grid_query : ''
  const gridQuery = normalizeGridQuery(rawGridQuery)
  // Der Rohwert aus der URL wird unvalidiert als Hinweis-Prop durchgereicht, damit das SSR
  // deterministisch bleibt, ohne selbst zu validieren -- FansubVersionBrowser prüft ihn
  // client-seitig gegen die geladene fansubOptions-Allowlist und verwirft ihn dort bei Bedarf.
  const rawFansubParam =
    typeof resolvedSearchParams.fansub === 'string' ? resolvedSearchParams.fansub : undefined

  const embySeriesUrl = getEmbySeriesUrlForAnime(anime.id)

  // Die Fansub-Relationen werden zuerst geladen, damit der SSR-Episoden-Fetch bereits mit dem
  // aufgelösten Filter-Slug startet -- sonst würde die Seite kurz alle Episoden zeigen, bevor
  // sie auf die gewählte Fansub-Gruppe filtert ("Alle"->Gruppe-Flackern).
  const [animeFansubsResult] = await Promise.allSettled([getAnimeFansubs(anime.id)])
  const animeFansubsResponse = animeFansubsResult.status === 'fulfilled' ? animeFansubsResult.value : null
  const resolvedFansubSlug = resolveActiveFansubSlug(animeFansubsResponse?.data ?? [], rawFansubParam)

  const [groupedEpisodesResult, relationsResult] = await Promise.allSettled([
    getGroupedEpisodes(anime.id, {
      projection: 'public',
      limit: 24,
      ...(resolvedFansubSlug ? { fansub: resolvedFansubSlug } : {}),
    }),
    getAnimeRelations(anime.id),
  ])

  const groupedEpisodesResponse = groupedEpisodesResult.status === 'fulfilled' ? groupedEpisodesResult.value : null

  const fansubStoryGroups = buildFansubStoryGroups(animeFansubsResponse?.data ?? [])

  const relationsResponse = relationsResult.status === 'fulfilled' ? relationsResult.value : null
  // Die Trefferzahl kommt aus der gefilterten Fetch-Antwort, nicht aus anime.episodes.length
  // (das wäre die ungefilterte Gesamtzahl) -- als episodeCount-Prop an FansubVersionBrowser
  // durchgereicht.
  const episodeCount = groupedEpisodesResponse?.data.episode_count ?? 0

  // Eine einzige, bereits aufgelöste Quelle für das Poster und jeden dekorativen
  // Cover-Verbraucher (Backdrop-Fallback, Banner-Hintergrund, Poster-Bild) -- vermeidet
  // abweichende Cover-URLs zwischen den mehreren Konsumenten in AnimeDetailView.
  const coverUrl = resolveAnimeCoverURL(anime.cover_image)

  // Die Randnavigations-HREFs müssen bereits im Server-HTML stehen, nicht erst nach
  // der Client-Hydration. gridParams ist nur vorhanden, wenn die Seite über einen Grid-Kontext
  // (von-der-Übersicht-Link) aufgerufen wurde -- ohne Grid-Kontext gibt es keine wohldefinierte
  // Nachbarschaftsreihenfolge, die Randnavigation entfällt dann vollständig (unverändertes
  // Verhalten). Bei einem Fehlschlag des zusätzlichen getAnimeList-Aufrufs (Promise.allSettled,
  // gleiches Fail-open-Muster wie bei den übrigen SSR-Datenabrufen dieser Seite) wird der
  // jeweilige Button einfach weggelassen statt einen kaputten Link zu zeigen.
  const gridParams = parseAnimeListParamsFromGridQuery(gridQuery)
  const [neighborsResult] = gridParams
    ? await Promise.allSettled([resolveAnimeNeighbors(gridParams, anime.id)])
    : [{ status: 'fulfilled' as const, value: { prev: null, next: null } as AnimeNeighbors }]
  const neighbors = neighborsResult.status === 'fulfilled' ? neighborsResult.value : { prev: null, next: null }
  const previous = gridParams ? buildAdjacentNavItem(neighbors.prev, gridParams, 'prev') : null
  const next = gridParams ? buildAdjacentNavItem(neighbors.next, gridParams, 'next') : null

  return (
    <AnimeDetailView
      anime={anime}
      breadcrumbItems={breadcrumbItems}
      gridQuery={gridQuery}
      embySeriesUrl={embySeriesUrl}
      animeFansubsResponse={animeFansubsResponse}
      groupedEpisodesResponse={groupedEpisodesResponse}
      fansubStoryGroups={fansubStoryGroups}
      relationsResponse={relationsResponse}
      episodeCount={episodeCount}
      coverUrl={coverUrl}
      rawFansubParam={rawFansubParam}
      previous={previous}
      next={next}
    />
  )
}

/**
 * Baut aus einem serverseitig aufgelösten Nachbarn das `href`/`label`/`ariaLabel`-Tripel für
 * `AdjacentNavigation`. Die fünf Hover-/Fokus-Handler bleiben bewusst unbesetzt -- sie gehören
 * zur client-seitigen Vorschaukarte und werden erst von `AnimeEdgeNavigation` selbst ergänzt,
 * nachdem die Hydration abgeschlossen ist.
 *
 * @param target - Aufgelöster Nachbar samt Zielseite, oder null, wenn keiner existiert
 * @param gridParams - Aktuelle Grid-Filterparameter (für den Ziel-Query mit angepasster Seite)
 * @param direction - 'prev' oder 'next', bestimmt Beschriftung/ARIA-Text
 * @returns Fertiges Navigations-Item oder null, wenn kein Nachbar existiert
 */
function buildAdjacentNavItem(
  target: AnimeNeighbors['prev'],
  gridParams: ReturnType<typeof parseAnimeListParamsFromGridQuery>,
  direction: 'prev' | 'next',
): AdjacentNavigationItem | null {
  if (!target || !gridParams) return null
  const isPrevious = direction === 'prev'
  return {
    href: buildAnimeDetailHref(target.anime.id, buildAnimeGridQuery({ ...gridParams, page: target.page })),
    label: isPrevious ? 'Zurück' : 'Weiter',
    ariaLabel: `${isPrevious ? 'Vorheriger' : 'Nächster'} Anime: ${target.anime.title}`,
  }
}
