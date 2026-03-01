'use client'

import { GroupedEpisode } from '@/types/episodeVersion'
import { VersionRow } from './VersionRow'
import styles from './EpisodesOverview.module.css'

interface EpisodeAccordionProps {
  episode: GroupedEpisode
  isExpanded: boolean
  onToggle: () => void
  onPlayVersion?: (versionId: number) => void
}

export function EpisodeAccordion({
  episode,
  isExpanded,
  onToggle,
  onPlayVersion,
}: EpisodeAccordionProps) {
  const episodeId = `episode-${episode.episode_number}`
  const contentId = `${episodeId}-content`
  const paddedNumber = String(episode.episode_number).padStart(2, '0')

  return (
    <div className={styles.accordionItem}>
      <button
        id={episodeId}
        type="button"
        className={styles.accordionHeader}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className={styles.episodeNumberBadge}>EP {paddedNumber}</span>
        <span className={styles.episodeTitle}>
          {episode.episode_title || `Episode ${episode.episode_number}`}
        </span>
        <span className={styles.versionCountBadge}>
          {episode.version_count} {episode.version_count === 1 ? 'Version' : 'Versionen'}
        </span>
        <span
          className={`${styles.expandIcon} ${isExpanded ? styles.expandIconRotated : ''}`}
          aria-hidden="true"
        >
          v
        </span>
      </button>

      {isExpanded && (
        <div
          id={contentId}
          className={styles.accordionContent}
          role="region"
          aria-labelledby={episodeId}
        >
          {episode.versions.length === 0 ? (
            <p className={styles.noVersions}>Keine Versionen verfuegbar.</p>
          ) : (
            <div className={styles.versionList}>
              {episode.versions.map((version) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  isDefault={version.id === episode.default_version_id}
                  onPlay={onPlayVersion}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
