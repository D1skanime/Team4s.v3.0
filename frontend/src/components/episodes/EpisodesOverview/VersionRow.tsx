'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EpisodeVersion } from '@/types/episodeVersion'
import styles from './VersionRow.module.css'

interface VersionRowProps {
  version: EpisodeVersion
  isDefault?: boolean
}

export function VersionRow({ version, isDefault = false }: VersionRowProps) {
  const router = useRouter()
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

  const handleCopyStreamUrl = async () => {
    if (!version.stream_url) return
    try {
      await navigator.clipboard.writeText(version.stream_url)
    } catch {
      // Silent fail
    }
  }

  const getShortenedUrl = (url: string): string => {
    if (url.length <= 50) return url
    return `${url.substring(0, 47)}...`
  }

  return (
    <div className={`${styles.versionRow} ${isDefault ? styles.versionRowDefault : ''}`}>
      <div className={styles.versionMain}>
        {version.fansub_group ? (
          <div className={styles.fansubBadge}>
            {version.fansub_group.logo_url && (
              <Image
                src={version.fansub_group.logo_url}
                alt=""
                className={styles.fansubLogo}
                width={24}
                height={24}
                unoptimized
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

        {version.stream_url ? (
          <div className={`${styles.episodeStreamIndicator} ${styles.streamPresent}`}>
            <span className={styles.streamUrl} title={version.stream_url}>
              {getShortenedUrl(version.stream_url)}
            </span>
            <button
              type="button"
              className={styles.streamCopyButton}
              onClick={handleCopyStreamUrl}
              aria-label="Stream-URL kopieren"
            >
              Copy
            </button>
          </div>
        ) : (
          <span className={`${styles.episodeStreamIndicator} ${styles.streamAbsent}`}>
            Kein Stream-Link
          </span>
        )}
      </div>

      <div className={styles.versionActions}>
        {version.release_date && (
          <span className={styles.releaseDate}>{formatDate(version.release_date)}</span>
        )}
        <button
          type="button"
          className={styles.episodeEditButton}
          onClick={() => router.push(`/admin/episode-versions/${version.id}/edit`)}
          aria-label={`Version ${version.id} bearbeiten`}
        >
          Edit
        </button>
      </div>
    </div>
  )
}
