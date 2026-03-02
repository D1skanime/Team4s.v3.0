'use client'

import { GroupedEpisode } from '@/types/episodeVersion'
import { VersionRow } from './VersionRow'
import styles from './EpisodeAccordion.module.css'

interface EpisodeAccordionProps {
  episode: GroupedEpisode
  isExpanded: boolean
  onToggle: () => void
  onSyncEpisode?: (episodeNumber: number) => Promise<void>
  isSyncing?: boolean
  syncError?: string | null
}

export function EpisodeAccordion({
  episode,
  isExpanded,
  onToggle,
  onSyncEpisode,
  isSyncing = false,
  syncError = null,
}: EpisodeAccordionProps) {
  const episodeId = `episode-${episode.episode_number}`
  const contentId = `${episodeId}-content`
  const paddedNumber = String(episode.episode_number).padStart(2, '0')

  const handleSync = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (onSyncEpisode && !isSyncing) {
      await onSyncEpisode(episode.episode_number)
    }
  }

  return (
    <div className={styles.accordionItem}>
      <div className={styles.accordionHeaderWrapper}>
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
        {onSyncEpisode && (
          <button
            type="button"
            className={styles.episodeSyncButton}
            onClick={handleSync}
            disabled={isSyncing}
            aria-label={`Episode ${episode.episode_number} synchronisieren`}
          >
            {isSyncing ? (
              <span className={styles.syncSpinner} aria-hidden="true" />
            ) : null}
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>

      {syncError && (
        <div className={styles.syncErrorMessage}>
          {syncError}
        </div>
      )}

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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
