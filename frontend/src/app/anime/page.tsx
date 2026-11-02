import { Suspense } from 'react'

import { getAnimeList } from '@/lib/api'
import { buildAnimeGridQuery } from '@/lib/animeGridContext'
import { toNumber } from '@/lib/utils'
import { AnimeStatus, ContentType } from '@/types/anime'

import { AnimeListView } from './AnimeListView'
import AnimeListLoading from './AnimeListLoading'

// Diese Route haengt von Query-Parametern (A-Z-Buchstabenfilter, Pagination usw.) ab.
// Daher wird Next.js gezwungen, die Seite nicht als statisch vorzurendern.
export const dynamic = 'force-dynamic'

/** Props für die Anime-Listenseite mit optionalen URL-Suchparametern. */
interface AnimePageProps {
  searchParams:
    | Promise<{
        page?: string | string[]
        per_page?: string | string[]
        q?: string | string[]
        letter?: string | string[]
        content_type?: string | string[]
        status?: string | string[]
      }>
    | undefined
}

/** Aufgeloeste (nicht mehr Promise-basierte) Such-Parameter für die Anime-Listenseite. */
interface ResolvedAnimeSearchParams {
    page?: string | string[]
    per_page?: string | string[]
    q?: string | string[]
    letter?: string | string[]
    content_type?: string | string[]
    status?: string | string[]
}

const allowedContentTypes: ContentType[] = ['anime', 'hentai']
const allowedStatuses: AnimeStatus[] = ['ongoing', 'done', 'aborted', 'licensed']

/**
 * Anime-Listenseite.
 * Laedt die gefilterte Anime-Liste vom Backend und rendert das Raster mit A-Z-Filter und Pagination.
 * Unterstützt Query-Parameter: page, per_page, q, letter, content_type, status.
 */
export default function AnimePage({ searchParams }: AnimePageProps) {
  return (
    <Suspense fallback={<AnimeListLoading />}>
      <AnimeListContent searchParams={searchParams} />
    </Suspense>
  )
}

async function AnimeListContent({ searchParams }: AnimePageProps) {
  // Next.js may provide searchParams as a Promise-like value.
  const resolvedSearchParams = ((await searchParams) ?? {}) as ResolvedAnimeSearchParams

  const page = toNumber(resolvedSearchParams.page, 1)
  const perPage = Math.min(toNumber(resolvedSearchParams.per_page, 24), 100)
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q.trim() : ''

  const letter = typeof resolvedSearchParams.letter === 'string' ? resolvedSearchParams.letter : ''
  const contentType =
    typeof resolvedSearchParams.content_type === 'string' &&
    allowedContentTypes.includes(resolvedSearchParams.content_type as ContentType)
      ? (resolvedSearchParams.content_type as ContentType)
      : undefined
  const status =
    typeof resolvedSearchParams.status === 'string' && allowedStatuses.includes(resolvedSearchParams.status as AnimeStatus)
      ? (resolvedSearchParams.status as AnimeStatus)
      : undefined

  const listParams = {
    page,
    per_page: perPage,
    q,
    letter,
    content_type: contentType,
    status,
  }

  let response: Awaited<ReturnType<typeof getAnimeList>> | null = null
  try {
    response = await getAnimeList(listParams)
  } catch {}

  const gridQuery = buildAnimeGridQuery(listParams)

  return (
    <AnimeListView
      response={response}
      letter={letter}
      perPage={perPage}
      contentType={contentType}
      status={status}
      gridQuery={gridQuery}
    />
  )
}
