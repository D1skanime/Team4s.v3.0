import { KeyboardEvent } from 'react'

import { CoverFilter } from '../../types/admin-anime'
import styles from '../../../admin.module.css'

interface AnimeBrowserFiltersProps {
  queryInput: string
  letter: string
  hasCover: CoverFilter
  isLoading: boolean
  onQueryInputChange: (value: string) => void
  onApplySearch: () => void
  onClearQueryInput: () => void
  onLetterChange: (value: string) => void
  onCoverChange: (value: CoverFilter) => void
}

export function AnimeBrowserFilters({
  queryInput,
  letter,
  hasCover,
  isLoading,
  onQueryInputChange,
  onApplySearch,
  onClearQueryInput,
  onLetterChange,
  onCoverChange,
}: AnimeBrowserFiltersProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onApplySearch()
  }

  return (
    <div className={styles.gridTwo}>
      <div className={styles.field}>
        <label htmlFor="anime-browser-letter">API Filter (A-Z)</label>
        <select id="anime-browser-letter" value={letter} onChange={(event) => onLetterChange(event.target.value)} disabled={isLoading}>
          <option value="">Alle</option>
          <option value="0">0-9</option>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="anime-browser-query">Suche (Server)</label>
        <div className={styles.inputRow}>
          <input
            id="anime-browser-query"
            value={queryInput}
            onChange={(event) => onQueryInputChange(event.target.value)}
            disabled={isLoading}
            placeholder="z. B. attack"
            onKeyDown={handleKeyDown}
          />
          <button
            className={styles.buttonSecondary}
            type="button"
            disabled={isLoading || queryInput.length === 0}
            onClick={onClearQueryInput}
            aria-label="Suche leeren"
            title="Suche leeren"
          >
            X
          </button>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="anime-browser-has-cover">Cover</label>
        <select
          id="anime-browser-has-cover"
          value={hasCover}
          onChange={(event) => onCoverChange(event.target.value as CoverFilter)}
          disabled={isLoading}
        >
          <option value="all">Alle</option>
          <option value="missing">Nur ohne Cover</option>
          <option value="present">Nur mit Cover</option>
        </select>
      </div>
    </div>
  )
}
