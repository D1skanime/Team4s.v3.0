import { AnimeGrid } from '@/components/anime/AnimeGrid'
import { AnimeGridScrollRestorer } from '@/components/anime/AnimeGridScrollRestorer'
import { LetterFilter } from '@/components/anime/LetterFilter'
import { ErrorState, PageHeader, Pagination } from '@/components/ui'
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
        <PageHeader title="Anime" />
        <ErrorState
          title="Liste konnte nicht geladen werden"
          description="Die Anime-Liste konnte aktuell nicht geladen werden. Bitte laden Sie die Seite neu."
        />
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <AnimeGridScrollRestorer gridQuery={gridQuery} />

      <PageHeader title="Anime" description={`${response.meta.total.toLocaleString('de-DE')} Einträge`} />

      <LetterFilter currentLetter={letter} perPage={perPage} contentType={contentType} status={status} />
      <AnimeGrid anime={response.data} gridQuery={gridQuery} />
      {/* Bewusst ohne `linkComponent={Link}`: next/link ist zwar selbst "use client", aber im
          Next.js-16-Dev-Server lässt sich eine solche Komponentenreferenz nicht zuverlässig über
          die Server/Client-Grenze serialisieren -- einzeln, isoliert reproduziert (Fehlerzähler
          im Server-Log stieg bei genau diesem Request um exakt eins, bei entferntem
          `linkComponent` nicht; auf per Suspense gestreamten Seiten wie dieser bleibt der
          HTTP-Status dabei 200, der Fehler erscheint nur im Server-Log). `Pagination` fällt ohne
          `as`-Prop auf ein natives `<a>` zurück -- akzeptierter Kompromiss: voller Seitenwechsel
          statt Soft-Nav, für diese `force-dynamic`-Seite ohne spürbaren Unterschied. Soft-Nav
          ließe sich künftig wiederherstellen, indem `Pagination` fertig gerenderte Link-Elemente
          als Kinder statt einer Komponentenreferenz als Prop entgegennimmt. */}
      <Pagination
        currentPage={response.meta.page}
        totalPages={response.meta.total_pages}
        hrefPattern={buildAnimeListPageHref('{page}', { letter, perPage, contentType, status })}
      />
    </main>
  )
}
