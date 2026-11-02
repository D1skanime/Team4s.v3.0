import { ExternalLink } from 'lucide-react'

import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
import { AnimeInfoBanner, AnimeMediaProvider, AnimeTitleLogo } from '@/components/anime/AnimeMediaProvider'
import { AnimeRelations } from '@/components/anime/AnimeRelations'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import { StatusBadge } from '@/components/anime/StatusBadge'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import { Badge, BannerSection, Button, Card, ErrorState, Heading, LinkChip, MediaFrame, ResponsiveImage, Text } from '@/components/ui'
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

/** Baut den Such-Link für einen Tag-/Genre-Chip -- ohne freien Suchtext (`q`), da der Chip gezielt
 *  nach genau diesem Tag oder Genre filtert, nicht nach einem Stichwort. */
function buildFilterHref(kind: 'tag' | 'genre', name: string): string {
  return `/suche?${new URLSearchParams({ type: 'anime', [kind]: name }).toString()}`
}

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
 * durch. Zweiter Baustein des "ganze Seiten"-Storybook-Pilots (siehe `AnimeListView.tsx`): ihr
 * einziger Client-seitiger Netzwerk-Aufruf, `WatchlistAddButton`s `getWatchlistEntry`, wird in
 * Storybook über MSW abgefangen (`frontend/.storybook/mocks/handlers.ts`), nicht über Props.
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
  // D-03 (Badge onMedia statt Eigenbau-Stats-Overlay): 0/unbekannte Episodenzahl zeigt bewusst
  // KEIN Badge (kein "0 Folgen"), Einzahl "1 Folge" statt "1 Folgen".
  const posterEpisodeCount = anime.max_episodes ?? 0
  const posterEpisodeBadge = posterEpisodeCount > 0
    ? <Badge variant="onMedia">{posterEpisodeCount === 1 ? '1 Folge' : `${posterEpisodeCount} Folgen`}</Badge>
    : null

  return (
    <AnimeMediaProvider key={anime.id} animeID={anime.id}>
      <main className={styles.page}>
      {/* Banner-Hintergrund: BannerSection übernimmt die bisherige .heroBanner-Positionierung,
          AnimeBackdropRotator (eigenständiger Fachbaustein, position:fixed) wird darin komponiert. */}
      <BannerSection imageUrl={coverUrl} imageAlt={`${anime.title} Hintergrundbild`}>
        <AnimeBackdropRotator fallbackImageURL={coverUrl} />
      </BannerSection>

      {/* Breadcrumbs */}
      <div className={styles.breadcrumbsWrapper}>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* Hero Container (Glassmorphism) - 2 Column Grid */}
      <div className={styles.heroWrapper}>
        <section className={styles.heroContainer}>
          {/* Left: Poster Column */}
          <div className={styles.posterColumn}>
            <div
              className={styles.posterWrapper}
              style={{ '--poster-image': `url("${coverUrl}")` } as React.CSSProperties}
            >
              <MediaFrame aspectRatio={2 / 3} bottomBadge={posterEpisodeBadge} className={styles.poster}>
                <ResponsiveImage
                  src={coverUrl}
                  alt={anime.title}
                  fill
                  sizes="(max-width: 767px) 160px, (max-width: 1023px) 220px, 260px"
                  priority
                  unoptimized
                  className={styles.posterImage}
                />
              </MediaFrame>
            </div>

            {/* Poster Meta (Watchlist + Genres) */}
            <div className={styles.posterMeta}>
              <WatchlistAddButton
                animeID={anime.id}
                className={styles.watchlistButton}
                activeClassName={styles.watchlistButtonActive}
              />
              <hr className={styles.posterDivider} />
              <div className={styles.genresSection}>
                <span className={styles.genresLabel}>Genres</span>
                <div className={styles.genres}>
                  {anime.genres && anime.genres.length > 0 ? (
                    anime.genres.map((genre) => (
                      <LinkChip key={genre} href={buildFilterHref('genre', genre)}>
                        {genre}
                      </LinkChip>
                    ))
                  ) : (
                    <span className={styles.genrePlaceholder}>Anime</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Info Card -- öffentliche Glas-Fläche (Card variant="glass") statt
              seiteneigenem CSS (261102-hlg, D-05). Die Fläche selbst kommt jetzt komplett aus
              Card/Tokens, .infoCard liefert nur noch Layout-Feinschliff. */}
          <Card variant="glass" className={styles.infoCard}>
            {/* Title + Logo Row */}
            <div className={styles.titleRow}>
              <Heading level={1} tone="onScrim" className={styles.title}>{anime.title}</Heading>
              <AnimeTitleLogo title={anime.title} className={styles.titleLogo} />
            </div>

            {/* Badges -- StatusBadge bleibt bewusst ein eigenständiger Fachbaustein (eigenes
                CSS-Modul, eigene Status-Farblogik); die drei übrigen Pillen (Typ/Content-Type/
                Jahr) sind reine Metadaten ohne Statusbedeutung und werden deshalb auf das
                offizielle Badge-Grundelement umgestellt -- zwei getrennte, nebeneinander
                bestehende "Badge-Familien" (261102-hlg, D-04). */}
            <div className={styles.badges}>
              <StatusBadge status={anime.status} />
              <Badge variant="neutral">{anime.type.toUpperCase()}</Badge>
              <Badge variant="neutral">{anime.content_type}</Badge>
              <Badge variant="neutral">{anime.year ?? 'n/a'}</Badge>
            </div>

            {/* Description */}
            <Text tone="onScrim" className={styles.description}>
              {anime.description ?? 'Keine Beschreibung vorhanden.'}
            </Text>

            {/* Tags direkt unter der Beschreibung -- die Trennlinie zum nächsten Block folgt erst
                mit dem Banner, nicht schon hier, damit Tags optisch noch zur Beschreibung gehören */}
            {anime.tags && anime.tags.length > 0 && (
              <>
                <div className={styles.tagsSection}>
                  <h2 id="tags-heading" className={styles.tagsLabel}>Tags</h2>
                  <ul className={styles.tagsList} aria-labelledby="tags-heading">
                    {anime.tags.map((tag) => (
                      <li key={tag}>
                        <LinkChip tone="scrim" href={buildFilterHref('tag', tag)}>
                          {tag}
                        </LinkChip>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {embySeriesUrl && (
              <div className={styles.statsRow}>
                <Button
                  href={embySeriesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="text"
                  size="sm"
                  leftIcon={<ExternalLink size={14} aria-hidden="true" />}
                >
                  Emby
                </Button>
              </div>
            )}

            {/* Info Banner from Jellyfin */}
            <AnimeInfoBanner className={styles.infoBanner} dividerClassName={styles.divider} />

            {/* Related Animes Section - inside infoCard */}
            {relationsResponse && relationsResponse.data.length > 0 && (
              <div className={styles.relatedSection}>
                <AnimeRelations relations={relationsResponse.data} />
              </div>
            )}
          </Card>

          {/* Edge Navigation Overlay - positioned on heroContainer */}
          {gridQuery && (
            <div className={styles.edgeNavigationOverlay}>
              <AnimeEdgeNavigation currentAnimeID={anime.id} gridQuery={gridQuery} />
            </div>
          )}
        </section>
      </div>

      {/* Content Area (Episodes) */}
      <div className={styles.contentArea}>
        <section className={styles.episodesSection}>
          {groupedEpisodesResponse ? (
            <FansubVersionBrowser
              key={anime.id}
              animeID={anime.id}
              animeSlug={anime.slug}
              fansubs={animeFansubsResponse?.data ?? []}
              storyGroups={fansubStoryGroups}
              episodes={groupedEpisodesResponse.data.episodes}
              pagination={groupedEpisodesResponse.data.pagination}
              episodeCount={episodeCount}
              initialActiveSlug={rawFansubParam}
            />
          ) : (
            // Neutraler Fehlerhinweis statt der ungefilterten anime.episodes-Notfallliste, falls
            // die Episoden nicht geladen werden konnten -- jetzt über die offizielle, kompakte
            // ErrorState-Primitive statt eines Eigenbau-<div> (261102-hlg, D-04); role="alert"
            // kommt bereits aus ErrorState selbst.
            <ErrorState
              compact
              title="Episoden konnten nicht geladen werden"
              description="Die Episodenliste ist derzeit nicht verfügbar. Bitte laden Sie die Seite neu."
            />
          )}
        </section>
      </div>
      </main>
    </AnimeMediaProvider>
  )
}
