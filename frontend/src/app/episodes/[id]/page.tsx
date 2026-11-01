import Link from 'next/link'
import { ArrowLeft, Download, ExternalLink, Eye, Play } from 'lucide-react'

import { Button } from '@/components/ui'
import { ApiError, getEpisodeByID, getReleaseAssets } from '@/lib/api'
import { getPreferredEmbyEpisodeUrl } from '@/lib/emby'
import { EpisodeStatus } from '@/types/anime'
import { MediaAsset } from '@/types/mediaAsset'

import MediaAssetsSection from './components/MediaAssetsSection'
import ScreenshotGallery from './components/ScreenshotGallery'
import styles from './page.module.css'

interface EpisodeDetailPageProps {
  params:
    | {
        id: string
      }
    | Promise<{
        id: string
      }>
  searchParams?:
    | {
        releaseId?: string | string[]
        animeId?: string | string[]
        groupId?: string | string[]
      }
    | Promise<{
        releaseId?: string | string[]
        animeId?: string | string[]
        groupId?: string | string[]
      }>
}

const statusLabel: Record<EpisodeStatus, string> = {
  disabled: 'Deaktiviert',
  private: 'Privat',
  public: 'Oeffentlich',
}

const statusClassName: Record<EpisodeStatus, string> = {
  disabled: styles.statusDisabled,
  private: styles.statusPrivate,
  public: styles.statusPublic,
}

export default async function EpisodeDetailPage({ params, searchParams }: EpisodeDetailPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = ((await searchParams) ?? {}) as {
    releaseId?: string | string[]
    animeId?: string | string[]
    groupId?: string | string[]
  }
  const episodeID = Number.parseInt(resolvedParams.id, 10)
  if (Number.isNaN(episodeID) || episodeID <= 0) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">
            <ArrowLeft size={14} />
            Zur Anime-Liste
          </Link>
        </p>
        <div className={styles.errorBox}>Ungültige Episode-ID.</div>
      </main>
    )
  }

  let response: Awaited<ReturnType<typeof getEpisodeByID>> | null = null
  let message: string | null = null
  try {
    response = await getEpisodeByID(episodeID)
  } catch (error) {
    message =
      error instanceof ApiError && error.status === 404
        ? 'Episode nicht gefunden.'
        : 'Episode-Detailseite konnte nicht geladen werden.'
  }

  if (!response) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>{message ?? 'Episode-Detailseite konnte nicht geladen werden.'}</div>
      </main>
    )
  }

  const episode = response.data
  const title = episode.title ?? `Folge ${episode.episode_number}`
  const embyEpisodeUrl = getPreferredEmbyEpisodeUrl(episode.anime_id, episode.stream_links)
  const parsePositiveInt = (value?: string | string[]): number | null => {
    const raw = Array.isArray(value) ? value[0] : value
    const parsed = Number.parseInt((raw || '').trim(), 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  const activeReleaseID = parsePositiveInt(resolvedSearchParams.releaseId)
  const sourceAnimeID = parsePositiveInt(resolvedSearchParams.animeId)
  const sourceGroupID = parsePositiveInt(resolvedSearchParams.groupId)
  const hasGroupReleaseContext = activeReleaseID !== null && sourceAnimeID !== null && sourceGroupID !== null
  const playbackProxyUrl =
    activeReleaseID !== null ? `/api/releases/${activeReleaseID}/stream` : `/api/episodes/${episode.id}/play`
  let releaseAssets: MediaAsset[] = []
  let releaseAssetsError: string | null = null

  if (activeReleaseID !== null) {
    try {
      const releaseAssetsResponse = await getReleaseAssets(activeReleaseID)
      releaseAssets = releaseAssetsResponse.data.assets
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        releaseAssets = []
      } else if (error instanceof ApiError) {
        releaseAssetsError = error.message || 'Media Assets konnten nicht geladen werden.'
      } else {
        releaseAssetsError = 'Media Assets konnten nicht geladen werden.'
      }
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.navRow}>
        <p className={styles.backLink}>
          <Link href={hasGroupReleaseContext ? `/anime/${sourceAnimeID}/group/${sourceGroupID}/releases` : `/anime/${episode.anime_id}`}>
            <ArrowLeft size={14} />
            {hasGroupReleaseContext ? 'Zur Gruppen-Releaseansicht' : 'Zur Anime-Detailseite'}
          </Link>
        </p>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
      </div>

      <section className={styles.hero}>
        <p className={styles.kicker}>{episode.anime_title}</p>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.badges}>
          <span className={`${styles.statusBadge} ${statusClassName[episode.status]}`}>{statusLabel[episode.status]}</span>
          <span className={styles.metaBadge}>Folge {episode.episode_number}</span>
        </div>
        <div className={styles.metrics}>
          <span>
            <Eye size={16} />
            {episode.view_count.toLocaleString('de-DE')} Views
          </span>
          <span>
            <Download size={16} />
            {episode.download_count.toLocaleString('de-DE')} Downloads
          </span>
        </div>
      </section>

      <section className={styles.actions}>
        <h2>Episode Navigation</h2>
        <div className={styles.actionGrid}>
          {!hasGroupReleaseContext && episode.previous_episode_id ? (
            <Button as={Link} href={`/episodes/${episode.previous_episode_id}`} variant="secondary" className={styles.navButton} leftIcon={<ArrowLeft size={16} />}>
              Vorherige Folge
            </Button>
          ) : (
            <Button variant="secondary" disabled className={styles.navButton}>
              {hasGroupReleaseContext ? 'Release-Kontext aktiv' : 'Keine vorherige Folge'}
            </Button>
          )}

          <Button href={playbackProxyUrl} variant="secondary" className={styles.navButton} target="_blank" rel="noopener noreferrer" leftIcon={<Play size={16} />}>
            Direkt abspielen
          </Button>

          {embyEpisodeUrl ? (
            <Button
              href={embyEpisodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              className={styles.navButton}
              aria-label="Folge in Emby öffnen"
              leftIcon={<ExternalLink size={16} />}
            >
              In Emby öffnen
            </Button>
          ) : null}

          {!hasGroupReleaseContext && episode.next_episode_id ? (
            <Button as={Link} href={`/episodes/${episode.next_episode_id}`} variant="secondary" className={styles.navButton}>
              Nächste Folge
            </Button>
          ) : (
            <Button variant="secondary" disabled className={styles.navButton}>
              {hasGroupReleaseContext ? 'Zurück über Gruppen-Releases' : 'Keine nächste Folge'}
            </Button>
          )}
        </div>
      </section>

      <MediaAssetsSection
        releaseId={activeReleaseID ?? undefined}
        assets={releaseAssets}
        errorMessage={releaseAssetsError}
      />

      {hasGroupReleaseContext && sourceAnimeID !== null && sourceGroupID !== null && activeReleaseID !== null ? (
        <ScreenshotGallery animeId={sourceAnimeID} groupId={sourceGroupID} releaseVersionId={activeReleaseID} episodeLabel={episode.episode_number} />
      ) : null}
    </main>
  )
}
