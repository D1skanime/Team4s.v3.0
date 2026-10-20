'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'

import styles from './page.module.css'

interface ReleaseEpisode {
  id: number
  episode_id?: number | null
  episode_number: number
  title?: string | null
  version_label?: string | null
  thumbnail_url?: string | null
  has_op: boolean
  has_ed: boolean
  karaoke_count: number
  insert_count: number
  screenshot_count: number
  released_at?: string | null
}

interface ReleaseEpisodeCardProps {
  episode: ReleaseEpisode
  animeID: number
  groupID: number
}

export function ReleaseEpisodeCard({ episode, animeID, groupID }: ReleaseEpisodeCardProps) {
  if (episode.episode_id) {
    return (
      <Link
        href={`/episodes/${episode.episode_id}?releaseId=${episode.id}&animeId=${animeID}&groupId=${groupID}`}
        className={styles.releaseCard}
        aria-label={`Episode ${episode.episode_number}${episode.title ? `: ${episode.title}` : ''}`}
      >
        <article>
          {episode.thumbnail_url ? (
            <div className={styles.thumbnail}>
              <ResponsiveImage
                src={episode.thumbnail_url}
                alt={episode.title ?? `Episode ${episode.episode_number}`}
                width={320}
                height={180}
                className={styles.thumbnailImage}
              />
              <div className={styles.playOverlay}>
                <Play size={32} />
              </div>
            </div>
          ) : (
            <div className={styles.thumbnailPlaceholder}>
              <Play size={32} />
            </div>
          )}
          <div className={styles.releaseInfo}>
            <h3 className={styles.episodeTitle}>
              Episode {episode.episode_number}
              {episode.title ? `: ${episode.title}` : ''}
            </h3>
            {episode.version_label ? <p className={styles.releaseDate}>{episode.version_label}</p> : null}
            {episode.released_at ? (
              <p className={styles.releaseDate}>{new Date(episode.released_at).toLocaleDateString('de-DE')}</p>
            ) : null}
          </div>
        </article>
      </Link>
    )
  }

  return (
    <article className={styles.releaseCard} aria-label={`Episode ${episode.episode_number}`}>
      {episode.thumbnail_url ? (
        <div className={styles.thumbnail}>
          <ResponsiveImage
            src={episode.thumbnail_url}
            alt={episode.title ?? `Episode ${episode.episode_number}`}
            width={320}
            height={180}
            className={styles.thumbnailImage}
          />
        </div>
      ) : (
        <div className={styles.thumbnailPlaceholder}>
          <Play size={32} />
        </div>
      )}
      <div className={styles.releaseInfo}>
        <h3 className={styles.episodeTitle}>
          Episode {episode.episode_number}
          {episode.title ? `: ${episode.title}` : ''}
        </h3>
        {episode.version_label ? <p className={styles.releaseDate}>{episode.version_label}</p> : null}
        <p className={styles.releaseDate}>Episode-Route nicht verfügbar.</p>
      </div>
    </article>
  )
}
