import { RefObject } from 'react'

import { EpisodeStatus } from '@/types/anime'

import { formatEpisodeStatusLabel } from '../../utils/anime-helpers'
import styles from '../../../admin.module.css'

interface EpisodeFiltersProps {
  inputRef: RefObject<HTMLInputElement>
  query: string
  statusFilter: EpisodeStatus | 'all'
  density: 'compact' | 'comfortable'
  statusCounts: Record<string, number>
  totalCount: number
  visibleCount: number
  selectedVisibleCount: number
  selectedCount: number
  statuses: EpisodeStatus[]
  disabled: boolean
  onQueryChange: (value: string) => void
  onStatusFilterChange: (value: EpisodeStatus | 'all') => void
  onDensityChange: (value: 'compact' | 'comfortable') => void
}

export function EpisodeFilters({
  inputRef,
  query,
  statusFilter,
  density,
  statusCounts,
  totalCount,
  visibleCount,
  selectedVisibleCount,
  selectedCount,
  statuses,
  disabled,
  onQueryChange,
  onStatusFilterChange,
  onDensityChange,
}: EpisodeFiltersProps) {
  return (
    <div className={styles.gridTwo}>
      <div className={styles.field}>
        <label htmlFor="episode-filter">Filter</label>
        <input
          id="episode-filter"
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="z. B. 01 oder titel"
          disabled={disabled}
        />
      </div>
      <div className={styles.field}>
        <label>Anzeige</label>
        <p className={styles.hint}>
          {visibleCount} von {totalCount} | Auswahl: {selectedVisibleCount}/{visibleCount} sichtbar, {selectedCount} gesamt
        </p>
      </div>
      <div className={styles.field}>
        <label>Status</label>
        <div className={styles.chipRow} role="group" aria-label="Status Filter">
          <button
            type="button"
            className={`${styles.chip} ${statusFilter === 'all' ? styles.chipActive : ''}`}
            onClick={() => onStatusFilterChange('all')}
            disabled={disabled}
          >
            alle ({statusCounts.all})
          </button>
          {statuses.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.chip} ${statusFilter === value ? styles.chipActive : ''}`}
              onClick={() => onStatusFilterChange(value)}
              disabled={disabled}
            >
              {formatEpisodeStatusLabel(value)} ({statusCounts[value] ?? 0})
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <label>Dichte</label>
        <div className={styles.chipRow} role="group" aria-label="Listen Dichte">
          <button
            type="button"
            className={`${styles.chip} ${density === 'compact' ? styles.chipActive : ''}`}
            onClick={() => onDensityChange('compact')}
            disabled={disabled}
          >
            kompakt
          </button>
          <button
            type="button"
            className={`${styles.chip} ${density === 'comfortable' ? styles.chipActive : ''}`}
            onClick={() => onDensityChange('comfortable')}
            disabled={disabled}
          >
            komfortabel
          </button>
        </div>
      </div>
    </div>
  )
}
