import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
import { AnimeMediaProvider } from '@/components/anime/AnimeMediaProvider'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { BannerSection, type AdjacentNavigationItem } from '@/components/ui'
import { getAnimeFansubs, getAnimeRelations } from '@/lib/api'
import { resolveAnimeCoverURL } from '@/lib/animeBackdrops'
import { buildFansubStoryGroups } from '@/lib/fansub-summary'
import type { AnimeDetail } from '@/types/anime'
// `getGroupedEpisodes` ist überladen (ein Signatur-Zweig mit `projection: 'public'` liefert
// `PublicGroupedEpisodesResponse`, der andere ohne Options-Argument `GroupedEpisodesResponse`) --
// `Awaited<ReturnType<typeof getGroupedEpisodes>>` würde sich auf die zuletzt deklarierte
// Überladung (den generischen Zweig) auflösen, nicht auf den hier tatsächlich genutzten
// `projection: 'public'`-Zweig. Deshalb wird der Typ hier explizit benannt statt erraten.
import type { PublicGroupedEpisodesResponse } from '@/types/episodeVersion'

import styles from './AnimeDetailView.styles'
import { AnimeDetailHero } from './AnimeDetailHero'
import { AnimeEpisodesSection } from './AnimeEpisodesSection'

export interface AnimeDetailViewProps {
  anime: AnimeDetail
  breadcrumbItems: { label: string; href?: string }[]
  gridQuery: string
  embySeriesUrl: string | null
  animeFansubsResponse: Awaited<ReturnType<typeof getAnimeFansubs>> | null
  groupedEpisodesResponse: PublicGroupedEpisodesResponse | null
  fansubStoryGroups: ReturnType<typeof buildFansubStoryGroups>
  relationsResponse: Awaited<ReturnType<typeof getAnimeRelations>> | null
  episodeCount: number
  coverUrl: string
  rawFansubParam?: string
  /** Serverseitig aufgelöste Randnavigations-Ziele (Befund 19) -- bereits vollständig berechnete
   *  href/label/ariaLabel-Tripel, die noch vor jeder Client-Hydration im HTML stehen müssen. */
  previous: AdjacentNavigationItem | null
  next: AdjacentNavigationItem | null
}

/**
 * Reine Darstellungskomponente der öffentlichen Anime-Detailseite (Backdrop, Hero mit Poster/
 * Info-Card, Episoden-Browser) -- enthält KEINE eigene Datenbeschaffung mehr. Die
 * Server-Komponente `AnimeDetailContent` (`page.tsx`) lädt `loadAnimeDetail`/`getAnimeFansubs`/
 * `getGroupedEpisodes`/`getAnimeRelations` weiterhin selbst und reicht die Ergebnisse als Props
 * durch. Zweiter Baustein des "ganze Seiten"-Storybook-Pilots (siehe `AnimeListView.tsx`): die
 * Client-Anfragen von Medienkontext, Merkliste, Gruppenwechsel und Randnavigation werden in
 * Storybook zentral über MSW abgefangen (`frontend/.storybook/mocks/handlers.ts`), nicht über
 * Props oder ein erreichbares Entwicklungs-Backend.
 */
export function AnimeDetailView({
  anime,
  breadcrumbItems,
  gridQuery,
  embySeriesUrl,
  animeFansubsResponse,
  groupedEpisodesResponse,
  fansubStoryGroups,
  relationsResponse,
  episodeCount,
  coverUrl,
  rawFansubParam,
  previous,
  next,
}: AnimeDetailViewProps) {
  // Ein fehlendes Cover bleibt ein regulärer Darstellungsfall: dieselbe öffentliche
  // Platzhalterdatei versorgt Banner, Rotator und Poster statt ein leeres Image-Attribut zu
  // senden. `page.tsx` liefert `coverUrl` bereits über resolveAnimeCoverURL(anime.cover_image)
  // vor (dort nie leer, dessen eigener Fallback greift schon serverseitig) -- dieser Zweig
  // greift deshalb nur, wenn ein Aufrufer (z. B. eine Storybook-Story wie "Fehlendes Cover")
  // bewusst einen leeren String übergibt. Derselbe kanonische Resolver statt eines rohen
  // Literal-Pfads: liefert dieselbe begrenzte, dekodierbare Auslieferungs-Route wie ein echtes
  // Cover, statt eines inzwischen verworfenen, nicht dekodierbaren JPG-Platzhalter-Literals
  // (159-05, siehe animeBackdrops.ts resolveAnimeCoverURL).
  const displayCoverUrl = coverUrl || resolveAnimeCoverURL('')

  return (
    <AnimeMediaProvider key={anime.id} animeID={anime.id}>
      <main className={styles.page}>
      {/* Banner-Hintergrund: BannerSection übernimmt die bisherige .heroBanner-Positionierung,
          AnimeBackdropRotator (eigenständiger Fachbaustein, position:fixed) wird darin komponiert. */}
      <BannerSection variant="anime" imageUrl={displayCoverUrl} imageAlt={`${anime.title} Hintergrundbild`}>
        <AnimeBackdropRotator fallbackImageURL={displayCoverUrl} />
      </BannerSection>

      {/* Breadcrumbs */}
      <div className={styles.breadcrumbsWrapper}>
        <Breadcrumbs items={breadcrumbItems} textHalo variant="scrim" />
      </div>

      {/* Anime-Kopf: Card(publicHero)+SplitLayout+Randnavigations-Slot liegen seit Befund 21/22
          vollständig in AnimeDetailHero selbst -- diese Seite ordnet nur noch den Baustein an
          (Breitenvertrag über .heroWrapper), ohne dessen inneres Raster/Optik zu kennen. */}
      <div className={styles.heroWrapper}>
        <AnimeDetailHero
          anime={anime}
          coverUrl={displayCoverUrl}
          embySeriesUrl={embySeriesUrl}
          relationsResponse={relationsResponse}
          edgeNavigation={gridQuery ? <AnimeEdgeNavigation currentAnimeID={anime.id} gridQuery={gridQuery} previous={previous} next={next} /> : null}
        />
      </div>

      {/* Inhaltsbereich (Episoden) */}
      <div className={styles.contentArea}>
        <AnimeEpisodesSection animeID={anime.id} animeSlug={anime.slug ?? ''} animeFansubsResponse={animeFansubsResponse} groupedEpisodesResponse={groupedEpisodesResponse} fansubStoryGroups={fansubStoryGroups} episodeCount={episodeCount} rawFansubParam={rawFansubParam} />
      </div>
      </main>
    </AnimeMediaProvider>
  )
}
