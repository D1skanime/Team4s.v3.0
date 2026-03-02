import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { Download, ExternalLink, Eye, Play } from 'lucide-react'

import { AnimeBackdropRotator } from '@/components/anime/AnimeBackdropRotator'
import { AnimeEdgeNavigation } from '@/components/anime/AnimeEdgeNavigation'
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
  getFansubBySlug,
  getAnimeFansubs,
  getGroupedEpisodes,
  getWatchlistEntry,
} from '@/lib/api'
import { buildAnimeListHrefFromGridQuery, normalizeGridQuery } from '@/lib/animeGridContext'
import { getEmbySeriesUrlForAnime } from '@/lib/emby'
import { getCoverUrl } from '@/lib/utils'

import styles from './page.module.css'

const API_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

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
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>Ungueltige Anime-ID.</div>
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
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>{message ?? 'Anime-Detailseite konnte nicht geladen werden.'}</div>
      </main>
    )
  }

  const anime = response.data
  const fromGrid = typeof resolvedSearchParams.from === 'string' && resolvedSearchParams.from === 'anime-grid'
  const rawGridQuery =
    typeof resolvedSearchParams.grid_query === 'string' ? resolvedSearchParams.grid_query : ''
  const gridQuery = normalizeGridQuery(rawGridQuery)
  const backToGridHref = fromGrid ? buildAnimeListHrefFromGridQuery(gridQuery) : '/anime'

  const embySeriesUrl = getEmbySeriesUrlForAnime(anime.id)
  let animeFansubsResponse: Awaited<ReturnType<typeof getAnimeFansubs>> | null = null
  let groupedEpisodesResponse: Awaited<ReturnType<typeof getGroupedEpisodes>> | null = null
  try {
    animeFansubsResponse = await getAnimeFansubs(anime.id)
    groupedEpisodesResponse = await getGroupedEpisodes(anime.id)
  } catch {
    // fallback to legacy episode list rendering below
  }
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

  let commentsResponse: Awaited<ReturnType<typeof getAnimeComments>> | null = null
  let commentsError: string | null = null
  try {
    commentsResponse = await getAnimeComments(animeID, { page: 1, per_page: 10 })
  } catch {
    commentsError = 'Kommentare konnten nicht geladen werden.'
  }

  let inWatchlist = false
  if (authToken) {
    try {
      await getWatchlistEntry(animeID, authToken)
      inWatchlist = true
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        // ignore non-critical watchlist preload failures on detail page
      }
    }
  }

  let infoBannerURL: string | null = null
  let infoLogoURL: string | null = null
  try {
    const backdropsResponse = await getAnimeBackdrops(anime.id)
    const rawBannerURL = (backdropsResponse.data.banner_url || '').trim()
    const rawBackdropBannerURL = (backdropsResponse.data.backdrops[0] || '').trim()
    const rawLogoURL = (backdropsResponse.data.logo_url || '').trim()
    const bannerCandidate = rawBannerURL || rawBackdropBannerURL
    if (bannerCandidate) {
      const base = API_PUBLIC_BASE_URL.endsWith('/') ? API_PUBLIC_BASE_URL : `${API_PUBLIC_BASE_URL}/`
      const imageURL = new URL(bannerCandidate, base)
      imageURL.searchParams.set('width', '1280')
      imageURL.searchParams.set('quality', '86')
      infoBannerURL = imageURL.toString()
    }
    if (rawLogoURL) {
      const base = API_PUBLIC_BASE_URL.endsWith('/') ? API_PUBLIC_BASE_URL : `${API_PUBLIC_BASE_URL}/`
      const logoURL = new URL(rawLogoURL, base)
      logoURL.searchParams.set('width', '760')
      logoURL.searchParams.set('quality', '90')
      infoLogoURL = logoURL.toString()
    }
  } catch {
    infoBannerURL = null
    infoLogoURL = null
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLink}>
        <Link href={backToGridHref}>Zur Anime-Liste</Link>
      </p>

      <section className={styles.heroShell}>
        <AnimeBackdropRotator animeID={anime.id} coverImage={anime.cover_image} />
        <section className={styles.hero}>
          <Image
            src={getCoverUrl(anime.cover_image)}
            alt={anime.title}
            width={400}
            height={600}
            className={styles.cover}
          />

          <div className={styles.info}>
            <div className={styles.infoHeader}>
              <h1 className={styles.title}>{anime.title}</h1>
              {infoLogoURL ? <img src={infoLogoURL} alt={`${anime.title} Logo`} className={styles.infoLogo} /> : null}
            </div>
            <div className={styles.badges}>
              <StatusBadge status={anime.status} />
              <span className={styles.metaBadge}>{anime.type.toUpperCase()}</span>
              <span className={styles.metaBadge}>{anime.content_type}</span>
              <span className={styles.metaBadge}>{anime.year ?? 'n/a'}</span>
            </div>
            <p className={styles.description}>{anime.description ?? 'Keine Beschreibung vorhanden.'}</p>
            <div className={styles.stats}>
              <span>
                <Eye size={16} />
                {anime.view_count.toLocaleString('de-DE')} Views
              </span>
              <span>{anime.max_episodes ?? 0} Episoden geplant</span>
            </div>
            {infoBannerURL ? <img src={infoBannerURL} alt="" className={styles.infoBanner} /> : null}
            {embySeriesUrl ? (
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
            ) : null}
            <WatchlistAddButton animeID={anime.id} initiallyInWatchlist={inWatchlist} />
          </div>
        </section>
        {gridQuery ? <AnimeEdgeNavigation currentAnimeID={anime.id} gridQuery={gridQuery} /> : null}
      </section>

      <section className={styles.episodesSection}>
        <h2>Episoden ({anime.episodes.length})</h2>
        {animeFansubsResponse && animeFansubsResponse.data.length > 0 ? (
          <div className={styles.fansubRow}>
            {animeFansubsResponse.data.map((relation) =>
              relation.fansub_group ? (
                <Link
                  key={relation.fansub_group.id}
                  href={`/fansubs/${relation.fansub_group.slug}`}
                  className={styles.fansubChip}
                >
                  {relation.fansub_group.name}
                </Link>
              ) : null,
            )}
          </div>
        ) : null}
        {groupedEpisodesResponse && fansubStoryGroups.length > 0 ? (
          <ActiveFansubStory
            animeID={anime.id}
            fansubGroups={fansubStoryGroups}
            animeFansubs={animeFansubsResponse?.data ?? []}
          />
        ) : null}
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
    </main>
  )
}
