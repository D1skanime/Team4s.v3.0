import { AnimeGrid } from '@/components/anime/AnimeGrid'
import { AnimeGridScrollRestorer } from '@/components/anime/AnimeGridScrollRestorer'
import { LetterFilter } from '@/components/anime/LetterFilter'
import { Pagination } from '@/components/anime/Pagination'
import { getAnimeList } from '@/lib/api'
import { buildAnimeGridQuery } from '@/lib/animeGridContext'
import { toNumber } from '@/lib/utils'
import { AnimeStatus, ContentType } from '@/types/anime'

import styles from './page.module.css'

// Diese Route haengt von Query-Parametern (A-Z-Buchstabenfilter, Pagination usw.) ab.
// Daher wird Next.js gezwungen, die Seite nicht als statisch vorzurendern.
export const dynamic = 'force-dynamic'

/** Props fuer die Anime-Listenseite mit optionalen URL-Suchparametern. */
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
    | {
        page?: string | string[]
        per_page?: string | string[]
        q?: string | string[]
        letter?: string | string[]
        content_type?: string | string[]
        status?: string | string[]
      }
    | undefined
}

/** Aufgeloeste (nicht mehr Promise-basierte) Such-Parameter fuer die Anime-Listenseite. */
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
 * Unterstuetzt Query-Parameter: page, per_page, q, letter, content_type, status.
 */
export default async function AnimePage({ searchParams }: AnimePageProps) {
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

  if (!response) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Anime Liste</h1>
        </header>
        <div className={styles.errorBox}>
          <p>Die Anime-Liste konnte aktuell nicht geladen werden.</p>
        </div>
      </main>
    )
  }

  const gridQuery = buildAnimeGridQuery(listParams)

  return (
    <main className={styles.page}>
      <AnimeGridScrollRestorer gridQuery={gridQuery} />

      <header className={styles.header}>
        <p className={styles.kicker}>P0 MVP</p>
        <h1 className={styles.title}>Anime Liste</h1>
        <p className={styles.subtitle}>
          {response.meta.total.toLocaleString('de-DE')} Eintraege mit A-Z Filter und Pagination
        </p>
      </header>

      <LetterFilter currentLetter={letter} perPage={perPage} contentType={contentType} status={status} />
      <AnimeGrid anime={response.data} gridQuery={gridQuery} />
      <Pagination
        currentPage={response.meta.page}
        totalPages={response.meta.total_pages}
        letter={letter}
        perPage={perPage}
        contentType={contentType}
        status={status}
      />
    </main>
  )
}
