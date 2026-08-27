import { Select } from '@/components/ui/Select'
import { EpisodeStatus } from '@/types/anime'
import { FansubGroup } from '@/types/fansub'

import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import sharedStyles from '../../../admin.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

interface EpisodeBulkBarProps {
  statuses: EpisodeStatus[]
  fansubs: Array<Pick<FansubGroup, 'id' | 'name'>>
  selectedCount: number
  bulkStatus: EpisodeStatus | ''
  bulkFansubGroupID: number | ''
  isApplyingBulk: boolean
  isUpdating: boolean
  bulkProgress: { done: number; total: number } | null
  onClearSelection: () => void
  onBulkStatusChange: (status: EpisodeStatus | '') => void
  onApplyBulkStatus: () => void
  onBulkFansubGroupChange: (fansubGroupID: number | '') => void
  onApplyBulkFansubGroup: () => void
  onRemoveSelected: () => void
}

export function EpisodeBulkBar({
  statuses,
  fansubs,
  selectedCount,
  bulkStatus,
  bulkFansubGroupID,
  isApplyingBulk,
  isUpdating,
  bulkProgress,
  onClearSelection,
  onBulkStatusChange,
  onApplyBulkStatus,
  onBulkFansubGroupChange,
  onApplyBulkFansubGroup,
  onRemoveSelected,
}: EpisodeBulkBarProps) {
  return (
    <div className={styles.bulkActionBar} role="region" aria-label="Mehrfachaktionen">
      <div className={styles.bulkSummary}>
        <strong>{selectedCount}</strong> ausgewählt
        {isApplyingBulk && bulkProgress ? <span className={styles.bulkProgress}> ({bulkProgress.done}/{bulkProgress.total})</span> : null}
      </div>

      <div className={styles.bulkActions}>
        <Select
          className={styles.bulkSelect}
          value={bulkStatus}
          onChange={(event) => onBulkStatusChange(event.target.value as EpisodeStatus | '')}
          disabled={isApplyingBulk || isUpdating}
          aria-label="Status für Auswahl"
        >
          <option value="">Status wählen</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {formatEpisodeStatusLabel(value)}
            </option>
          ))}
        </Select>
        <button
          className={styles.buttonSecondary}
          type="button"
          disabled={isApplyingBulk || isUpdating || bulkStatus === '' || selectedCount === 0}
          onClick={onApplyBulkStatus}
        >
          Status ändern
        </button>
        <Select
          className={styles.bulkSelect}
          value={bulkFansubGroupID}
          onChange={(event) => onBulkFansubGroupChange(event.target.value ? Number.parseInt(event.target.value, 10) : '')}
          disabled={isApplyingBulk || isUpdating}
          aria-label="Fansub-Gruppe für Auswahl"
        >
          <option value="">Gruppe wählen</option>
          {fansubs.map((fansub) => (
            <option key={fansub.id} value={fansub.id}>
              {fansub.name}
            </option>
          ))}
        </Select>
        <button
          className={styles.buttonSecondary}
          type="button"
          disabled={isApplyingBulk || isUpdating || bulkFansubGroupID === '' || selectedCount === 0}
          onClick={onApplyBulkFansubGroup}
        >
          Gruppe ergänzen
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
