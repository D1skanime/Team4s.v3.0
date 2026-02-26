import { EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import styles from '../../../admin.module.css'

interface EpisodeBulkBarProps {
  statuses: EpisodeStatus[]
  visibleCount: number
  selectedCount: number
  allVisibleSelected: boolean
  bulkStatus: EpisodeStatus | ''
  isApplyingBulk: boolean
  isUpdating: boolean
  bulkProgress: { done: number; total: number } | null
  onToggleAllVisible: () => void
  onClearSelection: () => void
  onBulkStatusChange: (status: EpisodeStatus | '') => void
  onApplyBulkStatus: () => void
  onRemoveSelected: () => void
}

export function EpisodeBulkBar({
  statuses,
  visibleCount,
  selectedCount,
  allVisibleSelected,
  bulkStatus,
  isApplyingBulk,
  isUpdating,
  bulkProgress,
  onToggleAllVisible,
  onClearSelection,
  onBulkStatusChange,
  onApplyBulkStatus,
  onRemoveSelected,
}: EpisodeBulkBarProps) {
  return (
    <div className={styles.actions}>
      <button
        className={styles.buttonSecondary}
        type="button"
        disabled={isApplyingBulk || isUpdating || visibleCount === 0}
        onClick={onToggleAllVisible}
      >
        {allVisibleSelected ? 'Sichtbare abwaehlen' : 'Sichtbare auswaehlen'} ({visibleCount})
      </button>
      <button
        className={styles.buttonSecondary}
        type="button"
        disabled={isApplyingBulk || isUpdating || selectedCount === 0}
        onClick={onClearSelection}
      >
        Auswahl leeren ({selectedCount})
      </button>
      <select value={bulkStatus} onChange={(event) => onBulkStatusChange(event.target.value as EpisodeStatus | '')} disabled={isApplyingBulk || isUpdating}>
        <option value="">Bulk: Status setzen...</option>
        {statuses.map((value) => (
          <option key={value} value={value}>
            {formatEpisodeStatusLabel(value)}
          </option>
        ))}
      </select>
      <button
        className={styles.button}
        type="button"
        disabled={isApplyingBulk || isUpdating || bulkStatus === '' || selectedCount === 0}
        onClick={onApplyBulkStatus}
      >
        {isApplyingBulk && bulkProgress ? `Bulk... ${bulkProgress.done}/${bulkProgress.total}` : 'Bulk anwenden'}
      </button>
      <button
        className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
        type="button"
        disabled={isApplyingBulk || isUpdating || selectedCount === 0}
        onClick={onRemoveSelected}
      >
        {isApplyingBulk && bulkProgress ? `Entfernen... ${bulkProgress.done}/${bulkProgress.total}` : `Aus Anime entfernen (${selectedCount})`}
      </button>
    </div>
  )
}