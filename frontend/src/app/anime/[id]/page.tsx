import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { Download, ExternalLink, Eye, Play } from 'lucide-react'

import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
import { AnimeRelations } from '@/components/anime/AnimeRelations'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import { ActiveFansubStory } from '@/components/fansubs/ActiveFansubStory'
import { StatusBadge } from '@/components/anime/StatusBadge'
import { CommentSection } from '@/components/comments/CommentSection'
import { WatchlistAddButton } from '@/components/watchlist/WatchlistAddButton'
import type { FansubGroup } from '@/types/fansub'
import {
  ApiError,
  AUTH_BEARER_TOKEN,
  AUTH_TOKEN_COOKIE_NAME,
  getAnimeByID,
  getAnimeBackdrops,
  getAnimeComments,
  getAnimeRelations,
  getFansubBySlug,
  getAnimeFansubs,
  getGroupedEpisodes,
  getWatchlistEntry,
} from '@/lib/api'
import { resolveInfoBannerURL } from '@/lib/animeBackdrops'
import { normalizeGridQuery } from '@/lib/animeGridContext'
import { getEmbySeriesUrlForAnime } from '@/lib/emby'
import { getCoverUrl } from '@/lib/utils'

import styles from './page.module.css'

interface AnimeDetailPageProps {
  params:
    | {
        id: string
      }
    | Promise<{
        id: string
      }>
  searchParams?:
    | {
        from?: string | string[]
        grid_query?: string | string[]
      }
    | Promise<{
        from?: string | string[]
        grid_query?: string | string[]
      }>
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeoutID = setTimeout(() => {
      reject(new Error('request timeout'))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeoutID)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeoutID)
        reject(error)
      })
  })
}

export default async function AnimeDetailPage({ params, searchParams }: AnimeDetailPageProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as {
    from?: string | string[]
    grid_query?: string | string[]
  }
  const cookieStore = await cookies()
  const authTokenFromCookie = (cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value || '').trim()
  const authToken = authTokenFromCookie || AUTH_BEARER_TOKEN

  const resolvedParams = await params
  const animeID = Number.parseInt(resolvedParams.id, 10)
  if (Number.isNaN(animeID) || animeID <= 0) {
    return (
      <main className={styles.page}>
        <div className={styles.errorPage}>
          <p className={styles.backLink}>
            <Link href="/anime">Zur Anime-Liste</Link>
          </p>
          <div className={styles.errorBox}>Ungueltige Anime-ID.</div>
        </div>
      </main>
    )
  }

  let response: Awaited<ReturnType<typeof getAnimeByID>> | null = null
  let message: string | null = null
  try {
    response = await getAnimeByID(animeID)
  } catch (error) {
    message =
      error instanceof ApiError && error.status === 404
        ? 'Anime nicht gefunden.'
        : 'Anime-Detailseite konnte nicht geladen werden.'
  }

  if (!response) {
    return (
      <main className={styles.page}>
        <div className={styles.errorPage}>
          <p className={styles.backLink}>
            <Link href="/anime">Zur Anime-Liste</Link>
          </p>
          <div className={styles.errorBox}>{message ?? 'Anime-Detailseite konnte nicht geladen werden.'}</div>
        </div>
      </main>
    )
  }

  const anime = response.data
  const breadcrumbItems = [
    { label: 'Anime', href: '/anime' },
    { label: anime.title },
  ]
  const rawGridQuery =
    typeof resolvedSearchParams.grid_query === 'string' ? resolvedSearchParams.grid_query : ''
  const gridQuery = normalizeGridQuery(rawGridQuery)

  const embySeriesUrl = getEmbySeriesUrlForAnime(anime.id)
  const [animeFansubsResult, groupedEpisodesResult, commentsResult, watchlistResult, backdropResult, relationsResult] =
    await Promise.allSettled([
      getAnimeFansubs(anime.id),
      getGroupedEpisodes(anime.id),
      getAnimeComments(animeID, { page: 1, per_page: 10 }),
      authToken ? getWatchlistEntry(animeID, authToken) : Promise.resolve(null),
      withTimeout(getAnimeBackdrops(anime.id), 4000),
      getAnimeRelations(anime.id),
    ])

  const animeFansubsResponse = animeFansubsResult.status === 'fulfilled' ? animeFansubsResult.value : null
  const groupedEpisodesResponse = groupedEpisodesResult.status === 'fulfilled' ? groupedEpisodesResult.value : null

  const fansubDetailsBySlug = new Map<string, FansubGroup>()
  if (animeFansubsResponse && animeFansubsResponse.data.length > 0) {
    const slugs = Array.from(
      new Set(
        animeFansubsResponse.data
          .map((relation) => relation.fansub_group?.slug?.trim() || '')
          .filter((slug) => slug.length > 0),
      ),
    )
    const detailResults = await Promise.allSettled(slugs.map((slug) => getFansubBySlug(slug)))
    for (const result of detailResults) {
      if (result.status !== 'fulfilled') continue
      fansubDetailsBySlug.set(result.value.data.slug, result.value.data)
    }
  }

  const fansubStoryGroups: FansubGroup[] = []
  if (animeFansubsResponse) {
    const seen = new Set<number>()
    for (const relation of animeFansubsResponse.data) {
      const slug = relation.fansub_group?.slug || ''
      const detail = fansubDetailsBySlug.get(slug)
      if (!detail) continue
      if (seen.has(detail.id)) continue
      seen.add(detail.id)
      fansubStoryGroups.push(detail)
    }
  }

  const commentsResponse = commentsResult.status === 'fulfilled' ? commentsResult.value : null
  const commentsError = commentsResult.status === 'rejected' ? 'Kommentare konnten nicht geladen werden.' : null
  const inWatchlist = watchlistResult.status === 'fulfilled' && Boolean(watchlistResult.value)
  const backdropManifest = backdropResult.status === 'fulfilled' ? backdropResult.value.data : null
  const relationsResponse = relationsResult.status === 'fulfilled' ? relationsResult.value : null
  const infoBannerURL = resolveInfoBannerURL(backdropManifest)

  // Get cover image for banner background
  const coverUrl = getCoverUrl(anime.cover_image)

  // Extract genres if available
  const genres: string[] = (anime as unknown as { genres?: string[] }).genres ?? []

  return (
    <main className={styles.page}>
      {/* Banner with blurred background */}
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

      {/* Hero Container (Glassmorphism) */}
      <div className={styles.heroWrapper}>
        <section className={styles.heroContainer}>
          {/* 2-Column Grid */}
          <div className={styles.heroTop}>
            {/* Left: Poster Column */}
            <div className={styles.posterColumn}>
              <div className={styles.posterWrapper}>
                <Image
                  src={coverUrl}
                  alt={anime.title}
                  width={260}
                  height={390}
                  className={styles.poster}
                  priority
                />
                <div className={styles.posterFade} />
              </div>

              {/* Watchlist Button */}
              <WatchlistAddButton
                animeID={anime.id}
                initiallyInWatchlist={inWatchlist}
                className={styles.watchlistButton}
                activeClassName={styles.watchlistButtonActive}
              />

              {/* Genres */}
              {genres.length > 0 && (
                <div className={styles.genres}>
                  {genres.map((genre) => (
                    <Link
                      key={genre}
                      href={`/anime?genre=${encodeURIComponent(genre)}`}
                      className={styles.genreChip}
                      prefetch={false}
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info Card */}
            <div className={styles.infoCard}>
              <h1 className={styles.title}>{anime.title}</h1>

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

              {/* Stats */}
              <div className={styles.stats}>
                <span>
                  <Eye size={16} />
                  {anime.view_count.toLocaleString('de-DE')} Views
                </span>
                <span>{anime.max_episodes ?? 0} Episoden geplant</span>
              </div>

              {/* Info Banner */}
              {infoBannerURL && (
                <Image
                  src={infoBannerURL}
                  alt=""
                  className={styles.infoBanner}
                  width={600}
                  height={180}
                  unoptimized
                />
              )}

              {/* External Links */}
              {embySeriesUrl && (
                <div className={styles.externalLinks}>
                  <a
                    className={styles.externalLinkButton}
                    href={embySeriesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Anime in Emby oeffnen"
                  >
                    <ExternalLink size={15} />
                    In Emby oeffnen
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Edge Navigation */}
          {gridQuery && (
            <div className={styles.edgeNavigation}>
              <AnimeEdgeNavigation currentAnimeID={anime.id} gridQuery={gridQuery} />
            </div>
          )}

          {/* Related Section */}
          {relationsResponse && relationsResponse.data.length > 0 && (
            <>
              <hr className={styles.divider} />
              <section className={styles.relatedSection}>
                <h2 className={styles.relatedTitle}>Related</h2>
                <AnimeRelations relations={relationsResponse.data} variant="compact" />
              </section>
            </>
          )}
        </section>
      </div>

      {/* Content Area (Episodes, Comments) */}
      <div className={styles.contentArea}>
        <section className={styles.episodesSection}>
          <h2>Episoden ({anime.episodes.length})</h2>
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
          {groupedEpisodesResponse && fansubStoryGroups.length > 0 && (
            <ActiveFansubStory
              animeID={anime.id}
              fansubGroups={fansubStoryGroups}
              animeFansubs={animeFansubsResponse?.data ?? []}
            />
          )}
          {groupedEpisodesResponse ? (
            <FansubVersionBrowser
              key={anime.id}
              animeID={anime.id}
              fansubs={animeFansubsResponse?.data ?? []}
              episodes={groupedEpisodesResponse.data.episodes}
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

        <CommentSection
          key={anime.id}
          animeID={anime.id}
          initialComments={commentsResponse?.data ?? []}
          initialTotal={commentsResponse?.meta.total ?? 0}
          initialError={commentsError}
        />
      </div>
    </main>
  )
}
