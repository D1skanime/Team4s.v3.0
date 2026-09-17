import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import { AnimeContributionsSection } from '@/components/anime/AnimeContributionsSection'
import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
import { AnimeInfoBanner, AnimeMediaProvider, AnimeTitleLogo } from '@/components/anime/AnimeMediaProvider'
import { AnimeRelations } from '@/components/anime/AnimeRelations'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import { StatusBadge } from '@/components/anime/StatusBadge'
import { CommentSection } from '@/components/comments/CommentSection'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import {
  getAnimeComments,
  getAnimeRelations,
  getAnimeFansubs,
  getGroupedEpisodes,
} from '@/lib/api'
import { normalizeGridQuery } from '@/lib/animeGridContext'
import { buildFansubStoryGroups, resolveActiveFansubSlug } from '@/lib/fansub-summary'
import { getEmbySeriesUrlForAnime } from '@/lib/emby'
import { resolveAnimeCoverURL } from '@/lib/animeBackdrops'

import type { AnimeDetail } from '@/types/anime'

import AnimeDetailLoading from './AnimeDetailLoading'
import { loadAnimeDetail } from './animeDetailData'
import styles from './page.module.css'

/** Baut den q-losen Such-Link fuer einen Tag-/Genre-Chip ueber den etablierten URLSearchParams-Mechanismus (D-09). */
function buildFilterHref(kind: 'tag' | 'genre', name: string): string {
  return `/suche?${new URLSearchParams({ type: 'anime', [kind]: name }).toString()}`
}

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
  const animeID = anime.id
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

  const [groupedEpisodesResult, commentsResult, relationsResult] = await Promise.allSettled([
    getGroupedEpisodes(anime.id, {
      projection: 'public',
      limit: 24,
      ...(resolvedFansubSlug ? { fansub: resolvedFansubSlug } : {}),
    }),
    getAnimeComments(animeID, { page: 1, per_page: 10 }),
    getAnimeRelations(anime.id),
  ])

  const groupedEpisodesResponse = groupedEpisodesResult.status === 'fulfilled' ? groupedEpisodesResult.value : null

  const fansubStoryGroups = buildFansubStoryGroups(animeFansubsResponse?.data ?? [])

  const commentsResponse = commentsResult.status === 'fulfilled' ? commentsResult.value : null
  const commentsError = commentsResult.status === 'rejected' ? 'Kommentare konnten nicht geladen werden.' : null
  const relationsResponse = relationsResult.status === 'fulfilled' ? relationsResult.value : null
  // D-12: die Trefferzahl kommt aus der gefilterten Fetch-Antwort, nicht mehr aus
  // anime.episodes.length -- als episodeCount-Prop an FansubVersionBrowser durchgereicht.
  const episodeCount = groupedEpisodesResponse?.data.episode_count ?? 0

  // One already bounded source for the poster and every decorative cover consumer.
  const coverUrl = resolveAnimeCoverURL(anime.cover_image)

  return (
    <AnimeMediaProvider key={anime.id} animeID={anime.id}>
      <main className={styles.page}>
      {/* Backdrop Rotator (Videos & Images from Jellyfin) */}
      <AnimeBackdropRotator fallbackImageURL={coverUrl} />

      {/* Banner with blurred background (fallback) */}
      <div className={styles.heroBanner}>
        <div
          className={styles.bannerImage}
          style={{ backgroundImage: `url("${coverUrl}")` }}
        />
        <div className={styles.bannerOverlay} />
      </div>

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
              <Image
                src={coverUrl}
                alt={anime.title}
                width={260}
                height={390}
                className={styles.poster}
                priority
                unoptimized
              />
              {/* Stats Overlay on Poster */}
              <div className={styles.posterStats}>
                <span className={styles.posterEpisodes}>{anime.max_episodes ?? 0} Episodes</span>
              </div>
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
                      <Link key={genre} className={styles.genreChip} href={buildFilterHref('genre', genre)}>
                        {genre}
                      </Link>
                    ))
                  ) : (
                    <span className={styles.genreChip}>Anime</span>
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

            {/* Tags (D-12-D-19): direkt unter der Beschreibung, Linie folgt erst mit dem Banner */}
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

      {/* Content Area (Episodes, Comments) */}
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
            // D-16: neutraler Fehlerhinweis statt der ungefilterten anime.episodes-Notfallliste.
            // Literal-Text statt ErrorState-Primitive: dieser Server-Component-Ast wird von
            // page.test.tsx nur ueber eine flache props.children-Baumwanderung geprueft, die
            // NICHT durch fremde Komponenten hindurch rendert (ErrorStates title/description
            // sind fuer diese Prüfung unsichtbare Props, keine JSX-Children). FansubVersionBrowser
            // (Task 2) nutzt ErrorState/EmptyState regulaer, dort rendert echtes RTL react-dom.
            <div className={styles.emptyEpisodes} role="alert">
              <p>Episoden konnten nicht geladen werden.</p>
              <p>Die Episodenliste ist derzeit nicht verfügbar. Bitte laden Sie die Seite neu.</p>
            </div>
          )}
        </section>

        <AnimeContributionsSection animeID={anime.id} />

        <CommentSection
          key={anime.id}
          animeID={anime.id}
          initialComments={commentsResponse?.data ?? []}
          initialTotal={commentsResponse?.meta.total ?? 0}
          initialError={commentsError}
        />
      </div>
      </main>
    </AnimeMediaProvider>
  )
}
