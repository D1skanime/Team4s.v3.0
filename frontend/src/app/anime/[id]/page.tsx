import { Suspense } from 'react'
import type { Metadata } from 'next'

import {
  getAnimeRelations,
  getAnimeFansubs,
  getGroupedEpisodes,
} from '@/lib/api'
import { normalizeGridQuery } from '@/lib/animeGridContext'
import { buildFansubStoryGroups, resolveActiveFansubSlug } from '@/lib/fansub-summary'
import { getEmbySeriesUrlForAnime } from '@/lib/emby'
import { resolveAnimeCoverURL } from '@/lib/animeBackdrops'

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
 * Laedt Anime-Daten sowie die textuellen Detailbereiche serverseitig. Backdrops und Theme-Videos
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
  // D-04: SSR-Determinismus -- der Rohwert wird unvalidiert als Hinweis-Prop durchgereicht,
  // FansubVersionBrowser prueft ihn client-seitig gegen die geladene fansubOptions-Allowlist (T-162-06).
  const rawFansubParam =
    typeof resolvedSearchParams.fansub === 'string' ? resolvedSearchParams.fansub : undefined

  const embySeriesUrl = getEmbySeriesUrlForAnime(anime.id)

  // D-11: die Fansub-Relationen werden zuerst geladen, damit der SSR-Episoden-Fetch
  // bereits mit dem aufgeloesten Filter-Slug startet (kein "Alle"->Gruppe-Flackern).
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
  // D-12: die Trefferzahl kommt aus der gefilterten Fetch-Antwort, nicht mehr aus
  // anime.episodes.length -- als episodeCount-Prop an FansubVersionBrowser durchgereicht.
  const episodeCount = groupedEpisodesResponse?.data.episode_count ?? 0

  // Eine einzige, bereits aufgelöste Quelle für das Poster und jeden dekorativen
  // Cover-Verbraucher (Backdrop-Fallback, Banner-Hintergrund, Poster-Bild) -- vermeidet
  // abweichende Cover-URLs zwischen den mehreren Konsumenten in AnimeDetailView.
  const coverUrl = resolveAnimeCoverURL(anime.cover_image)

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
    />
  )
}
