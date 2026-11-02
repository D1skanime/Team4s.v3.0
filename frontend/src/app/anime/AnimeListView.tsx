import { AnimeGrid } from '@/components/anime/AnimeGrid'
import { AnimeGridScrollRestorer } from '@/components/anime/AnimeGridScrollRestorer'
import { LetterFilter } from '@/components/anime/LetterFilter'
import { Pagination } from '@/components/ui'
import { AnimeStatus, ContentType, PaginatedAnimeResponse } from '@/types/anime'

import { buildAnimeListPageHref } from './animeListPageHref'
import styles from './page.module.css'

export interface AnimeListViewProps {
  /** Bewusst nullable: deckt sowohl den Erfolgsfall (Liste + Pagination) als auch den
   *  bisherigen Fehlerzweig ("Liste konnte nicht geladen werden") in EINER Props-Komponente ab --
   *  nur so lässt sich der Fehlerzustand als eigenständiger Fixture-Fall in Storybook abbilden. */
  response: PaginatedAnimeResponse | null
  letter: string
  perPage: number
  contentType?: ContentType
  status?: AnimeStatus
  gridQuery: string
}

/**
 * Reine Darstellungskomponente der öffentlichen Anime-Liste (A-Z-Filter, Grid, Pagination) --
 * enthält KEINE eigene Datenbeschaffung mehr. Die Server-Komponente `AnimeListContent`
 * (`page.tsx`) lädt `getAnimeList` weiterhin selbst und reicht das Ergebnis (auch im
 * Fehlerfall `null`) unverändert hier durch. Dieser Server/Ansicht-Split ist das Pilot-Muster für
 * künftige "ganze Seiten"-Storybook-Stories: dieselbe Komponente rendert identisch im echten
 * Next.js-SSR wie in `AnimeListView.stories.tsx` mit Fixture-Props, ganz ohne laufenden Server.
 */
export function AnimeListView({ response, letter, perPage, contentType, status, gridQuery }: AnimeListViewProps) {
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

  return (
    <main className={styles.page}>
      <AnimeGridScrollRestorer gridQuery={gridQuery} />

      <header className={styles.header}>
        <p className={styles.kicker}>P0 MVP</p>
        <h1 className={styles.title}>Anime Liste</h1>
        <p className={styles.subtitle}>
          {response.meta.total.toLocaleString('de-DE')} Einträge mit A-Z Filter und Pagination
        </p>
      </header>

      <LetterFilter currentLetter={letter} perPage={perPage} contentType={contentType} status={status} />
      <AnimeGrid anime={response.data} gridQuery={gridQuery} />
      {/* Bewusst ohne `linkComponent={Link}`: next/link ist zwar selbst "use client", aber im
          Next.js-16-Dev-Server lässt sich eine solche Komponentenreferenz nicht zuverlässig über
          die Server/Client-Grenze serialisieren (live reproduziert -- führte zu HTTP 500 bzw. bei
          per Suspense gestreamten Seiten zu einem stillen, nur im Log sichtbaren Serialisierungs-
          fehler). `Pagination` fällt ohne `as`-Prop auf ein natives `<a>` zurück, was für diese
          `force-dynamic`-Seite funktional gleichwertig ist (voller Seitenwechsel statt Soft-Nav). */}
      <Pagination
        currentPage={response.meta.page}
        totalPages={response.meta.total_pages}
        hrefPattern={buildAnimeListPageHref('{page}', { letter, perPage, contentType, status })}
      />
    </main>
  )
}
