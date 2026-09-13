import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Download, ExternalLink, Play } from 'lucide-react'

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
import { buildFansubStoryGroups } from '@/lib/fansub-summary'
import { getEmbySeriesUrlForAnime } from '@/lib/emby'
import { getCoverUrl, shouldUseUnoptimizedImage } from '@/lib/utils'

import type { AnimeDetail } from '@/types/anime'

import AnimeDetailLoading from './AnimeDetailLoading'
import { loadAnimeDetail } from './animeDetailData'
import styles from './page.module.css'

/** Props für die Anime-Detailseite mit URL-Parametern und optionalen Such-Parametern. */
interface AnimeDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ from?: string | string[]; grid_query?: string | string[] }>
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
  }
  const animeID = anime.id
  const breadcrumbItems = [
    { label: 'Anime', href: '/anime' },
    { label: anime.title },
  ]
  const rawGridQuery =
    typeof resolvedSearchParams.grid_query === 'string' ? resolvedSearchParams.grid_query : ''
  const gridQuery = normalizeGridQuery(rawGridQuery)

  const embySeriesUrl = getEmbySeriesUrlForAnime(anime.id)
  const [animeFansubsResult, groupedEpisodesResult, commentsResult, relationsResult] =
    await Promise.allSettled([
      getAnimeFansubs(anime.id),
      getGroupedEpisodes(anime.id, { projection: 'public', limit: 24 }),
      getAnimeComments(animeID, { page: 1, per_page: 10 }),
      getAnimeRelations(anime.id),
    ])

  const animeFansubsResponse = animeFansubsResult.status === 'fulfilled' ? animeFansubsResult.value : null
  const groupedEpisodesResponse = groupedEpisodesResult.status === 'fulfilled' ? groupedEpisodesResult.value : null

  const fansubStoryGroups = buildFansubStoryGroups(animeFansubsResponse?.data ?? [])

  const commentsResponse = commentsResult.status === 'fulfilled' ? commentsResult.value : null
  const commentsError = commentsResult.status === 'rejected' ? 'Kommentare konnten nicht geladen werden.' : null
  const relationsResponse = relationsResult.status === 'fulfilled' ? relationsResult.value : null
  const episodeCount = anime.episodes.length

  // Get cover image for banner background
  const coverUrl = getCoverUrl(anime.cover_image)
  const coverNeedsUnoptimized = shouldUseUnoptimizedImage(coverUrl)

  return (
    <AnimeMediaProvider key={anime.id} animeID={anime.id}>
      <main className={styles.page}>
      {/* Backdrop Rotator (Videos & Images from Jellyfin) */}
      <AnimeBackdropRotator coverImage={anime.cover_image} />

      {/* Banner with blurred background (fallback) */}
      <div className={styles.heroBanner}>
        <div
          className={styles.bannerImage}
          style={{ backgroundImage: `url(${coverUrl})` }}
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
              style={{ '--poster-image': `url(${coverUrl})` } as React.CSSProperties}
            >
              <Image
                src={coverUrl}
                alt={anime.title}
                width={260}
                height={390}
                className={styles.poster}
                priority
                unoptimized={coverNeedsUnoptimized}
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
                      <span key={genre} className={styles.genreChip}>
                        {genre}
                      </span>
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
          <h2>Episoden ({episodeCount})</h2>
          {animeFansubsResponse && animeFansubsResponse.data.length > 0 && (
            <div className={styles.fansubRow}>
              {animeFansubsResponse.data.map((relation) =>
                relation.fansub_group ? (
                  <Link
                    key={relation.fansub_group.id}
                    href={`/fansubs/${relation.fansub_group.slug}`}
                    prefetch={false}
                    className={styles.fansubChip}
                  >
                    {relation.fansub_group.name}
                  </Link>
                ) : null,
              )}
            </div>
          )}
          {groupedEpisodesResponse ? (
            <FansubVersionBrowser
              key={anime.id}
              animeID={anime.id}
              animeSlug={anime.slug}
              fansubs={animeFansubsResponse?.data ?? []}
              storyGroups={fansubStoryGroups}
              episodes={groupedEpisodesResponse.data.episodes}
              pagination={groupedEpisodesResponse.data.pagination}
            />
          ) : anime.episodes.length === 0 ? (
            <div className={styles.emptyEpisodes}>Noch keine Episoden vorhanden.</div>
          ) : (
            <ul className={styles.episodeList}>
              {anime.episodes.map((episode) => (
                <li key={episode.id} className={styles.episodeItem}>
                  <div>
                    <p className={styles.episodeNumber}>Folge {episode.episode_number}</p>
                    <p className={styles.episodeTitle}>{episode.title ?? 'Ohne Titel'}</p>
                    <p className={styles.episodeMeta}>
                      Views: {episode.view_count.toLocaleString('de-DE')} | Downloads:{' '}
                      {episode.download_count.toLocaleString('de-DE')} | Status: {episode.status}
                    </p>
                  </div>
                  <div className={styles.episodeActions}>
                    <Link href={`/episodes/${episode.id}`} className={styles.actionButton} aria-label="Episode streamen">
                      <Play size={16} />
                    </Link>
                    <Link
                      href={`/episodes/${episode.id}`}
                      className={styles.actionButton}
                      aria-label="Episode herunterladen"
                    >
                      <Download size={16} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
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
