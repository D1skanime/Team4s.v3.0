import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
import { AnimeMediaProvider } from '@/components/anime/AnimeMediaProvider'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { BannerSection } from '@/components/ui'
import { getAnimeFansubs, getAnimeRelations } from '@/lib/api'
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
}: AnimeDetailViewProps) {
  // Ein fehlendes Cover bleibt ein regulärer Darstellungsfall: dieselbe öffentliche
  // Platzhalterdatei versorgt Banner, Rotator und Poster statt ein leeres Image-Attribut zu senden.
  const displayCoverUrl = coverUrl || '/covers/placeholder.jpg'

  return (
    <AnimeMediaProvider key={anime.id} animeID={anime.id}>
      <main className={styles.page}>
      {/* Banner-Hintergrund: BannerSection übernimmt die bisherige .heroBanner-Positionierung,
          AnimeBackdropRotator (eigenständiger Fachbaustein, position:fixed) wird darin komponiert. */}
      <BannerSection imageUrl={displayCoverUrl} imageAlt={`${anime.title} Hintergrundbild`}>
        <AnimeBackdropRotator fallbackImageURL={displayCoverUrl} />
      </BannerSection>

      {/* Breadcrumbs */}
      <div className={styles.breadcrumbsWrapper}>
        <Breadcrumbs items={breadcrumbItems} textHalo />
      </div>

      {/* Hero Container (Glassmorphism) - 2 Column Grid */}
      <div className={styles.heroWrapper}>
        <section className={styles.heroContainer}>
          <AnimeDetailHero anime={anime} coverUrl={displayCoverUrl} embySeriesUrl={embySeriesUrl} relationsResponse={relationsResponse} />

          {/* Edge-Navigation-Overlay -- auf dem heroContainer positioniert */}
          {gridQuery && (
            <div className={styles.edgeNavigationOverlay}>
              <AnimeEdgeNavigation currentAnimeID={anime.id} gridQuery={gridQuery} />
            </div>
          )}
        </section>
      </div>

      {/* Inhaltsbereich (Episoden) */}
      <div className={styles.contentArea}>
        <AnimeEpisodesSection animeID={anime.id} animeSlug={anime.slug ?? ''} animeFansubsResponse={animeFansubsResponse} groupedEpisodesResponse={groupedEpisodesResponse} fansubStoryGroups={fansubStoryGroups} episodeCount={episodeCount} rawFansubParam={rawFansubParam} />
      </div>
      </main>
    </AnimeMediaProvider>
  )
}
