import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
import { AnimeInfoBanner, AnimeMediaProvider, AnimeTitleLogo } from '@/components/anime/AnimeMediaProvider'
import { AnimeRelations } from '@/components/anime/AnimeRelations'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import { StatusBadge } from '@/components/anime/StatusBadge'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import { Badge, BannerSection, LinkChip, MediaFrame, ResponsiveImage } from '@/components/ui'
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

          {/* Right: Info Card */}
          <div className={styles.infoCard}>
            {/* Title + Logo Row */}
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{anime.title}</h1>
              <AnimeTitleLogo title={anime.title} className={styles.titleLogo} />
            </div>

            {/* Badges */}
            <div className={styles.badges}>
              <StatusBadge status={anime.status} />
              <span className={styles.badge}>{anime.type.toUpperCase()}</span>
              <span className={styles.badge}>{anime.content_type}</span>
              <span className={styles.badge}>{anime.year ?? 'n/a'}</span>
            </div>

            {/* Description */}
            <p className={styles.description}>
              {anime.description ?? 'Keine Beschreibung vorhanden.'}
            </p>

            {/* Tags direkt unter der Beschreibung -- die Trennlinie zum nächsten Block folgt erst
                mit dem Banner, nicht schon hier, damit Tags optisch noch zur Beschreibung gehören */}
            {anime.tags && anime.tags.length > 0 && (
              <>
                <div className={styles.tagsSection}>
                  <h2 id="tags-heading" className={styles.tagsLabel}>Tags</h2>
                  <ul className={styles.tagsList} aria-labelledby="tags-heading">
                    {anime.tags.map((tag) => (
                      <li key={tag}>
                        <Link className={styles.tagChip} href={buildFilterHref('tag', tag)}>
                          {tag}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {embySeriesUrl && (
              <div className={styles.statsRow}>
                <a
                  className={styles.embyLink}
                  href={embySeriesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} />
                  Emby
                </a>
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
          </div>

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
            // die Episoden nicht geladen werden konnten. Bewusst Literal-Text statt der
            // ErrorState-Primitive: die zugehörigen Tests prüfen diesen Zweig über eine flache
            // Baumwanderung der JSX-Kinder, die nicht in fremde Komponenten hinein rendert --
            // ErrorStates title/description wären für eine solche Prüfung unsichtbare Props,
            // keine eigenen JSX-Kinder. FansubVersionBrowser nutzt ErrorState/EmptyState an
            // anderer Stelle regulär, dort läuft ein echter React-DOM-Render in den Tests mit.
            <div className={styles.emptyEpisodes} role="alert">
              <p>Episoden konnten nicht geladen werden.</p>
              <p>Die Episodenliste ist derzeit nicht verfügbar. Bitte laden Sie die Seite neu.</p>
            </div>
          )}
        </section>
      </div>
      </main>
    </AnimeMediaProvider>
  )
}
