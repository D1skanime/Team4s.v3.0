import { KeyboardEvent } from 'react'

import { CoverFilter } from '../../types/admin-anime'
import sharedStyles from '../../../admin.module.css'
import browserStyles from './AnimeBrowser.module.css'

const styles = { ...sharedStyles, ...browserStyles }

/**
 * Props der AnimeBrowserFilters-Komponente.
 * Enthalten den aktuellen Sucheingabe-String, den Buchstabenfilter,
 * den Cover-Filter und die zugehoerigen Aenderungs-Callbacks.
 */
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

/**
 * Filterleiste des Anime-Browsers.
 * Rendert Suchfeld mit Enter-Tastatur-Shortcut, Buchstabenfilter-Buttons
 * (Alle, 0-9, A-Z) und ein Cover-Status-Dropdown. Loest bei Enter
 * im Suchfeld die Suche aus.
 */
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
  const letterFilters = ['', '0', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    onApplySearch()
  }

  return (
    <div className={styles.grid}>
      <div className={styles.field}>
        <label htmlFor="anime-browser-query">Suche</label>
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
        <label>Startbuchstabe</label>
        <div className={styles.letterFilterBar} role="group" aria-label="Startbuchstabe">
          {letterFilters.map((value) => {
            const label = value === '' ? 'Alle' : value === '0' ? '0-9' : value
            const isActive = letter === value
            return (
              <button
                key={label}
                type="button"
                className={`${styles.letterFilterButton} ${isActive ? styles.letterFilterButtonActive : ''}`}
                onClick={() => onLetterChange(value)}
                disabled={isLoading}
              >
                {label}
              </button>
            )
          })}
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
