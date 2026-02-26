import { RefObject } from 'react'

import { EpisodeStatus } from '@/types/anime'

import sharedStyles from '../../../admin.module.css'
import episodeStyles from './EpisodeManager.module.css'

const styles = { ...sharedStyles, ...episodeStyles }

interface EpisodeFiltersProps {
  inputRef: RefObject<HTMLInputElement>
  query: string
  statusFilter: EpisodeStatus | 'all'
  density: 'compact' | 'comfortable'
  statusCounts: Record<string, number>
  visibleCount: number
  allVisibleSelected: boolean
  disabled: boolean
  onQueryChange: (value: string) => void
  onStatusFilterChange: (value: EpisodeStatus | 'all') => void
  onDensityChange: (value: 'compact' | 'comfortable') => void
  onToggleAllVisible: () => void
}

export function EpisodeFilters({
  inputRef,
  query,
  statusFilter,
  density,
  statusCounts,
  visibleCount,
  allVisibleSelected,
  disabled,
  onQueryChange,
  onStatusFilterChange,
  onDensityChange,
  onToggleAllVisible,
}: EpisodeFiltersProps) {
  const statusOptions: Array<{ value: EpisodeStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Alle' },
    { value: 'private', label: 'Privat' },
    { value: 'public', label: 'Oeffentlich' },
    { value: 'disabled', label: 'Deaktiviert' },
  ]

  return (
    <div className={styles.filterZoneGrid}>
      <section className={styles.zoneBlock}>
        <div className={styles.zoneBlockHeader}>
          <h4>Suche und Ansicht</h4>
        </div>
        <div className={styles.filterBlockBody}>
          <div className={styles.field}>
            <label htmlFor="episode-filter">Episoden suchen</label>
            <input
              id="episode-filter"
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="z. B. 01 oder Titel"
              disabled={disabled}
            />
          </div>
          <div className={styles.filterMetaRow}>
            <span className={styles.hint}>{visibleCount} Treffer sichtbar</span>
            <button className={styles.buttonSecondary} type="button" onClick={onToggleAllVisible} disabled={disabled || visibleCount === 0}>
              {allVisibleSelected ? 'Sichtbare abwaehlen' : 'Sichtbare auswaehlen'}
            </button>
          </div>
          <div className={styles.field}>
            <label>Dichte</label>
            <div className={styles.segmentedControl} role="group" aria-label="Listen-Dichte">
              <button
                type="button"
                className={`${styles.segmentedOption} ${density === 'compact' ? styles.segmentedOptionActive : ''}`}
                onClick={() => onDensityChange('compact')}
                disabled={disabled}
              >
                Kompakt
              </button>
              <button
                type="button"
                className={`${styles.segmentedOption} ${density === 'comfortable' ? styles.segmentedOptionActive : ''}`}
                onClick={() => onDensityChange('comfortable')}
                disabled={disabled}
              >
                Komfortabel
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.zoneBlock}>
        <div className={styles.zoneBlockHeader}>
          <h4>Statusfilter</h4>
        </div>
        <div className={styles.filterBlockBody}>
          <div className={styles.statusChipRow} role="group" aria-label="Status Filter">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterChip} ${statusFilter === option.value ? styles.filterChipActive : ''}`}
                onClick={() => onStatusFilterChange(option.value)}
                disabled={disabled}
              >
                {option.label}
                <span className={styles.filterChipCount}>{statusCounts[option.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
