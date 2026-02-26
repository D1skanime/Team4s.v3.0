import { EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import sharedStyles from '../../../admin.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

interface EpisodeBulkBarProps {
  statuses: EpisodeStatus[]
  selectedCount: number
  bulkStatus: EpisodeStatus | ''
  isApplyingBulk: boolean
  isUpdating: boolean
  bulkProgress: { done: number; total: number } | null
  onClearSelection: () => void
  onBulkStatusChange: (status: EpisodeStatus | '') => void
  onApplyBulkStatus: () => void
  onRemoveSelected: () => void
}

export function EpisodeBulkBar({
  statuses,
  selectedCount,
  bulkStatus,
  isApplyingBulk,
  isUpdating,
  bulkProgress,
  onClearSelection,
  onBulkStatusChange,
  onApplyBulkStatus,
  onRemoveSelected,
}: EpisodeBulkBarProps) {
  return (
    <div className={styles.bulkActionBar} role="region" aria-label="Mehrfachaktionen">
      <div className={styles.bulkSummary}>
        <strong>{selectedCount}</strong> ausgewaehlt
        {isApplyingBulk && bulkProgress ? <span className={styles.bulkProgress}> ({bulkProgress.done}/{bulkProgress.total})</span> : null}
      </div>

      <div className={styles.bulkActions}>
        <select
          className={styles.bulkSelect}
          value={bulkStatus}
          onChange={(event) => onBulkStatusChange(event.target.value as EpisodeStatus | '')}
          disabled={isApplyingBulk || isUpdating}
          aria-label="Status fuer Auswahl"
        >
          <option value="">Status waehlen</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {formatEpisodeStatusLabel(value)}
            </option>
          ))}
        </select>
        <button
          className={styles.buttonSecondary}
          type="button"
          disabled={isApplyingBulk || isUpdating || bulkStatus === '' || selectedCount === 0}
          onClick={onApplyBulkStatus}
        >
          Status aendern
        </button>
        <button
          className={styles.buttonSecondary}
          type="button"
          disabled={isApplyingBulk || isUpdating || selectedCount === 0}
          onClick={onClearSelection}
        >
          Auswahl aufheben
        </button>
        <button
          className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
          type="button"
          disabled={isApplyingBulk || isUpdating || selectedCount === 0}
          onClick={onRemoveSelected}
        >
          Entfernen
        </button>
      </div>
    </div>
  )
}
