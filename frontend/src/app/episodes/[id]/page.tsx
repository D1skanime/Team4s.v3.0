import Link from 'next/link'
import { ArrowLeft, Download, ExternalLink, Eye, Play } from 'lucide-react'

import { ApiError, getEpisodeByID } from '@/lib/api'
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

export default async function EpisodeDetailPage({ params }: EpisodeDetailPageProps) {
  const resolvedParams = await params
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
        <div className={styles.errorBox}>Ungueltige Episode-ID.</div>
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
  const playbackProxyUrl = `/api/episodes/${episode.id}/play`

  // Mock data for media assets (EPIC 8 will implement API)
  const mockAssets: MediaAsset[] = [
    {
      id: 1,
      type: 'opening',
      title: 'Opening 1',
      duration_seconds: 90,
      thumbnail_url: null,
      order: 1,
    },
    {
      id: 2,
      type: 'opening',
      title: 'Opening 2 (TV Size)',
      duration_seconds: 87,
      thumbnail_url: null,
      order: 2,
    },
    {
      id: 3,
      type: 'opening',
      title: 'Opening 3 (Special Version)',
      duration_seconds: 92,
      thumbnail_url: null,
      order: 3,
    },
    {
      id: 4,
      type: 'ending',
      title: 'Ending 1',
      duration_seconds: 88,
      thumbnail_url: null,
      order: 1,
    },
    {
      id: 5,
      type: 'ending',
      title: 'Ending 2',
      duration_seconds: 85,
      thumbnail_url: null,
      order: 2,
    },
    {
      id: 6,
      type: 'karaoke',
      title: 'Karaoke Opening',
      duration_seconds: 90,
      thumbnail_url: null,
      order: 1,
    },
    {
      id: 7,
      type: 'insert',
      title: 'Insert Song 1',
      duration_seconds: 120,
      thumbnail_url: null,
      order: 1,
    },
  ]

  return (
    <main className={styles.page}>
      <div className={styles.navRow}>
        <p className={styles.backLink}>
          <Link href={`/anime/${episode.anime_id}`}>
            <ArrowLeft size={14} />
            Zur Anime-Detailseite
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
          {episode.previous_episode_id ? (
            <Link href={`/episodes/${episode.previous_episode_id}`} className={styles.navButton}>
              <ArrowLeft size={16} />
              Vorherige Folge
            </Link>
          ) : (
            <span className={`${styles.navButton} ${styles.navButtonDisabled}`}>Keine vorherige Folge</span>
          )}

          <a href={playbackProxyUrl} className={styles.navButton} target="_blank" rel="noopener noreferrer">
            <Play size={16} />
            Direkt abspielen
          </a>

          {embyEpisodeUrl ? (
            <a
              href={embyEpisodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navButton}
              aria-label="Folge in Emby oeffnen"
            >
              <ExternalLink size={16} />
              In Emby oeffnen
            </a>
          ) : null}

          {episode.next_episode_id ? (
            <Link href={`/episodes/${episode.next_episode_id}`} className={styles.navButton}>
              Naechste Folge
            </Link>
          ) : (
            <span className={`${styles.navButton} ${styles.navButtonDisabled}`}>Keine naechste Folge</span>
          )}
        </div>
      </section>

      <MediaAssetsSection assets={mockAssets} />

      <ScreenshotGallery releaseId={episode.id} />
    </main>
  )
}
