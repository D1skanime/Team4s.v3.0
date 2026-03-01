'use client'

import { EpisodeVersion } from '@/types/episodeVersion'
import styles from './EpisodesOverview.module.css'

interface VersionRowProps {
  version: EpisodeVersion
  isDefault?: boolean
  onPlay?: (versionId: number) => void
}

export function VersionRow({ version, isDefault = false, onPlay }: VersionRowProps) {
  const subtitleLabel = version.subtitle_type === 'hardsub' ? 'Hardsub' : 'Softsub'
  const subtitleClass =
    version.subtitle_type === 'hardsub' ? styles.subtitleHardsub : styles.subtitleSoftsub

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className={`${styles.versionRow} ${isDefault ? styles.versionRowDefault : ''}`}>
      <div className={styles.versionMain}>
        {version.fansub_group ? (
          <div className={styles.fansubBadge}>
            {version.fansub_group.logo_url && (
              <img
                src={version.fansub_group.logo_url}
                alt=""
                className={styles.fansubLogo}
                width={24}
                height={24}
              />
            )}
            <span className={styles.fansubName}>{version.fansub_group.name}</span>
          </div>
        ) : (
          <span className={styles.fansubUnknown}>Unbekannte Gruppe</span>
        )}

        <div className={styles.versionMeta}>
          {version.video_quality && (
            <span className={styles.qualityBadge}>{version.video_quality}</span>
          )}
          {version.subtitle_type && (
            <span className={`${styles.subtitleBadge} ${subtitleClass}`}>{subtitleLabel}</span>
          )}
          {isDefault && <span className={styles.defaultBadge}>Standard</span>}
        </div>
      </div>

      <div className={styles.versionActions}>
        {version.release_date && (
          <span className={styles.releaseDate}>{formatDate(version.release_date)}</span>
        )}
        {onPlay && (
          <button
            type="button"
            className={styles.playButton}
            onClick={() => onPlay(version.id)}
            aria-label={`Play version ${version.id}`}
          >
            Play
          </button>
        )}
      </div>
    </div>
  )
}
